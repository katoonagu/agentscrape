import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "fs-extra";
import { chromium, type Browser } from "playwright";
import type {
  DecisionArtifact,
  DemoBuildPlanArtifact,
  DesignSeedArtifact,
  LeadArtifact,
  OperatorAuditEvent,
  OperatorAuditLog,
  PreviewManifestArtifact,
  QualificationArtifact,
  RedesignBriefArtifact,
  RunManifest,
  RunManifestLeadEntry,
  RunRequest,
  RunState,
  SiteSnapshotArtifact
} from "../../../shared/src/contracts";
import { readJsonFile, writeJsonFile, writeTextFile, ensureDirectory } from "../../../shared/src/fs";
import { createId, createRunId, nowIso } from "../../../shared/src/ids";
import { getRunPaths, toArtifactRef } from "../../../shared/src/paths";
import { SchemaValidator } from "../../../shared/src/schema";
import { loadManualInputRecords } from "../../intake/src/load-manual-input";
import { normalizeLeads, type NormalizedLeadRecord } from "../../intake/src/normalize-leads";
import { captureSiteSnapshot } from "../../snapshot/src/capture-site-snapshot";
import { qualifyLead } from "../../qualification/src/qualify-lead";
import { decideLead } from "../../decision/src/decide-lead";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";
import { loadPresets } from "../../generation/src/load-presets";
import { selectPrimaryPreset } from "../../generation/src/select-primary-preset";
import { resolveDesignSeed } from "../../generation/src/resolve-design-seed";
import { buildRedesignBrief } from "../../generation/src/build-redesign-brief";
import { buildDemoBuildPlan } from "../../generation/src/build-demo-build-plan";
import { renderDesignBriefProjection } from "../../generation/src/render-design-brief";
import { buildBlockedPreviewManifest, buildReadyPreviewManifest } from "../../preview/src/build-preview-manifest";
import { generateFrontOnlyPreview } from "../../preview/src/generate-front-only-preview";
import { generateSiteScaffold } from "../../site-scaffold/src/generate-site-scaffold";
import { verifyRunOutput } from "./verify-run-output";

interface RuntimeLeadContext {
  record: NormalizedLeadRecord;
  artifactBaseName: string;
  leadPath: string;
  snapshotPath?: string;
  qualificationPath?: string;
  decisionPath?: string;
  designSeedPath?: string;
  redesignBriefPath?: string;
  demoBuildPlanPath?: string;
  designBriefProjectionPath?: string;
  previewManifestPath?: string;
  screenshotDir: string;
  manifestIndex: number;
  snapshotArtifact?: SiteSnapshotArtifact;
  snapshotResult?: SnapshotExecutionResult;
  qualificationArtifact?: QualificationArtifact;
  decisionArtifact?: DecisionArtifact;
  designSeedArtifact?: DesignSeedArtifact;
  redesignBriefArtifact?: RedesignBriefArtifact;
  demoBuildPlanArtifact?: DemoBuildPlanArtifact;
}

export async function executeRun(
  requestPath: string,
  repoRoot: string,
  options?: { replaceExistingRun?: boolean }
): Promise<{ runId: string; runDir: string }> {
  const validator = new SchemaValidator(repoRoot);
  const rawRequest = await readJsonFile<unknown>(requestPath);
  const request = await validator.validate("run-request", rawRequest);

  assertRuntimeSupport(request);

  const runId = createRunId(request.requestId);
  const runPaths = getRunPaths(repoRoot, runId);
  const createdAt = nowIso();

  await prepareRunDirectory(runPaths.runDir, runId, options?.replaceExistingRun === true);
  await ensureDirectory(runPaths.runDir);
  await ensureDirectory(path.dirname(runPaths.runRequestPath));
  await writeJsonFile(runPaths.runRequestPath, request);

  const auditLog = createAuditLog(runId, createdAt);
  addAuditEvent(auditLog, {
    eventType: "RUN_REQUESTED",
    actorType: "operator",
    operatorId: request.operatorId,
    artifactRefs: [{ kind: "run-request", ref: toArtifactRef(repoRoot, runPaths.runRequestPath) }],
    notes: request.operatorNotes
  });
  addAuditEvent(auditLog, {
    eventType: "RUN_STARTED",
    actorType: "system",
    artifactRefs: [{ kind: "run-request", ref: toArtifactRef(repoRoot, runPaths.runRequestPath) }]
  });

  const { records, sourceRefs } = await loadManualInputRecords(repoRoot, requestPath, request.inputRefs);
  if (records.length === 0) {
    throw new Error("Manual input did not produce any records.");
  }

  const limitedRecords = applyLeadLimit(records, request.safeLimits?.maxLeads);
  if (limitedRecords.length !== records.length) {
    addAuditEvent(auditLog, {
      eventType: "NOTE_ADDED",
      actorType: "system",
      notes: `Applied safe limit maxLeads=${request.safeLimits?.maxLeads}; kept ${limitedRecords.length} of ${records.length} intake rows.`
    });
  }

  const normalizedLeads = normalizeLeads(limitedRecords, createdAt);
  const runtimeLeads = buildRuntimeLeadContexts(normalizedLeads, runPaths, repoRoot);

  const manifest: RunManifest = {
    runId,
    createdAt,
    workMode: request.workMode,
    runState: "INPUT_SELECTED",
    runRequestRef: toArtifactRef(repoRoot, runPaths.runRequestPath),
    operatorAuditLogRef: toArtifactRef(repoRoot, runPaths.auditLogPath),
    input: {
      kind: request.inputMode,
      sourceRef: sourceRefs[0],
      requestedLeadCount: limitedRecords.length
    },
    leads: runtimeLeads.map((context) => ({
      leadKey: context.record.lead.leadKey,
      leadRef: toArtifactRef(repoRoot, context.leadPath),
      currentState: context.record.lead.currentState ?? "INPUT_SELECTED",
      notes: context.record.lead.notes
    })),
    counts: {
      totalLeads: 0,
      withSite: 0,
      skipped: 0,
      auditOnly: 0,
      demoFrontOnly: 0,
      demoEditableContent: 0,
      previewReady: 0
    },
    artifacts: []
  };

  await persistAuditLog(validator, runPaths.auditLogPath, auditLog);

  for (const context of runtimeLeads) {
    await persistLeadArtifact(validator, context.record.lead, context.leadPath);
  }

  recalculateManifestCounts(manifest, runtimeLeads);
  await persistManifest(validator, runPaths.manifestPath, manifest);

  let browser: Browser | null = null;
  let browserStartError: string | null = null;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    browserStartError = error instanceof Error ? error.message : String(error);
    addAuditEvent(auditLog, {
      eventType: "NOTE_ADDED",
      actorType: "system",
      notes: `Playwright browser launch failed. Site leads will fall back to conservative audit-only path. ${browserStartError}`
    });
    await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
  }

  try {
    for (const context of runtimeLeads) {
      await processLead({
        browser,
        browserStartError,
        context,
        request,
        repoRoot,
        runPaths,
        validator,
        manifest,
        auditLog
      });
      recalculateManifestCounts(manifest, runtimeLeads);
      manifest.runState = "DECISION_MADE";
      await persistManifest(validator, runPaths.manifestPath, manifest);
      await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
    }

    let generationPartialFailure = false;
    if (request.executionBoundary === "generation" || request.executionBoundary === "preview") {
      generationPartialFailure = await continueGenerationPlanning({
        request,
        repoRoot,
        runPaths,
        validator,
        runtimeLeads,
        manifest,
        auditLog
      });
    }

    let previewPartialFailure = false;
    if (request.executionBoundary === "preview") {
      manifest.runState = "DEPLOYING_PREVIEW";
      await persistManifest(validator, runPaths.manifestPath, manifest);

      previewPartialFailure = await continuePreviewGeneration({
        request,
        repoRoot,
        runId,
        runPaths,
        validator,
        runtimeLeads,
        manifest,
        auditLog
      });
    }

    manifest.runState = generationPartialFailure || previewPartialFailure ? "PARTIAL_DONE" : "RUN_DONE";
    recalculateManifestCounts(manifest, runtimeLeads);
    await persistManifest(validator, runPaths.manifestPath, manifest);
    await persistAuditLog(validator, runPaths.auditLogPath, auditLog);

    const verification = await verifyRunOutput({
      repoRoot,
      target: runPaths.runDir
    });

    if (verification.status !== "pass") {
      addAuditEvent(auditLog, {
        eventType: "NOTE_ADDED",
        actorType: "system",
        notes: `Run output verification ${verification.status}: ${verification.issues.map((issue) => issue.message).join(" | ")}`
      });
      await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
    }

    if (verification.status === "fail") {
      manifest.runState = "FAILED_FINAL";
      await persistManifest(validator, runPaths.manifestPath, manifest);
      throw new Error(
        `Run output verification failed for ${runId}: ${verification.issues.map((issue) => issue.message).join(" | ")}`
      );
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return { runId, runDir: runPaths.runDir };
}

async function prepareRunDirectory(runDir: string, runId: string, replaceExistingRun: boolean): Promise<void> {
  const runDirExists = await fs.pathExists(runDir);
  if (!runDirExists) {
    return;
  }

  if (!replaceExistingRun) {
    throw new Error(
      `Run directory already exists for ${runId}. Change requestId or rerun with --replace-existing-run.`
    );
  }

  await fs.remove(runDir);
}

function assertRuntimeSupport(request: RunRequest): void {
  if (request.inputMode !== "manual-list") {
    throw new Error(`Unsupported inputMode "${request.inputMode}". This slice implements only "manual-list".`);
  }

  if (!["decision", "generation", "preview"].includes(request.executionBoundary)) {
    throw new Error(
      `Unsupported executionBoundary "${request.executionBoundary}". This slice implements only "decision", "generation", and "preview".`
    );
  }
}

function applyLeadLimit<T>(records: T[], maxLeads: number | undefined): T[] {
  if (!maxLeads || maxLeads <= 0) {
    return records;
  }

  return records.slice(0, maxLeads);
}

function buildRuntimeLeadContexts(
  normalizedLeads: NormalizedLeadRecord[],
  runPaths: ReturnType<typeof getRunPaths>,
  repoRoot: string
): RuntimeLeadContext[] {
  return normalizedLeads.map((record, index) => {
    const leadPath = path.join(runPaths.leadsDir, record.artifactFileName);
    const screenshotDir = path.join(runPaths.screenshotsDir, record.lead.leadKey);
    const artifactBaseName = path.parse(record.artifactFileName).name;

    return {
      record,
      artifactBaseName,
      leadPath,
      screenshotDir,
      manifestIndex: index
    };
  });
}

async function processLead(params: {
  browser: Browser | null;
  browserStartError: string | null;
  context: RuntimeLeadContext;
  request: RunRequest;
  repoRoot: string;
  runPaths: ReturnType<typeof getRunPaths>;
  validator: SchemaValidator;
  manifest: RunManifest;
  auditLog: OperatorAuditLog;
}): Promise<void> {
  const { browser, browserStartError, context, request, repoRoot, runPaths, validator, manifest, auditLog } = params;
  const { lead } = context.record;
  const manifestLead = manifest.leads[context.manifestIndex];

  if (!context.record.shouldInspect) {
    const decision = decideLead({ lead });
    context.decisionArtifact = decision;
    context.decisionPath = path.join(runPaths.decisionDir, `${context.artifactBaseName}.decision.json`);
    await persistDecisionArtifact(validator, decision, context.decisionPath);
    manifestLead.currentState = "DECISION_MADE";
    manifestLead.decision = decision.finalDecision;
    manifestLead.decisionRef = toArtifactRef(repoRoot, context.decisionPath);
    return;
  }

  lead.currentState = "QUALIFYING";
  await persistLeadArtifact(validator, lead, context.leadPath);
  manifestLead.currentState = "QUALIFYING";

  try {
    if (!browser) {
      throw new Error(browserStartError ?? "Playwright browser is unavailable.");
    }

    await fs.ensureDir(context.screenshotDir);
    const snapshotResult = await captureSiteSnapshot({
      browser,
      lead,
      screenshotsRoot: context.screenshotDir,
      maxPages: request.safeLimits?.maxPagesPerLead ?? 3
    });
    context.snapshotResult = snapshotResult;
    context.snapshotArtifact = snapshotResult.artifact;
    context.snapshotPath = path.join(runPaths.snapshotsDir, `${context.artifactBaseName}.site-snapshot.json`);
    await validator.validate("site-snapshot", snapshotResult.artifact);
    await writeJsonFile(context.snapshotPath, snapshotResult.artifact);

    const qualification = qualifyLead({
      lead,
      snapshotResult,
      snapshotRef: toArtifactRef(repoRoot, context.snapshotPath)
    });
    context.qualificationArtifact = qualification;
    context.qualificationPath = path.join(
      runPaths.qualificationDir,
      `${context.artifactBaseName}.qualification.json`
    );
    await persistQualificationArtifact(validator, qualification, context.qualificationPath);

    const decision = decideLead({
      lead,
      qualification,
      snapshotResult
    });
    context.decisionArtifact = decision;

    context.decisionPath = path.join(runPaths.decisionDir, `${context.artifactBaseName}.decision.json`);
    await persistDecisionArtifact(validator, decision, context.decisionPath);

    lead.currentState = "DECISION_MADE";
    await persistLeadArtifact(validator, lead, context.leadPath);

    manifestLead.currentState = "DECISION_MADE";
    manifestLead.qualificationRef = toArtifactRef(repoRoot, context.qualificationPath);
    manifestLead.decision = decision.finalDecision;
    manifestLead.decisionRef = toArtifactRef(repoRoot, context.decisionPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addAuditEvent(auditLog, {
      eventType: "NOTE_ADDED",
      actorType: "system",
      leadKey: lead.leadKey,
      notes: `Lead fallback path triggered: ${message}`
    });

    const fallbackDecision = decideLead({ lead });
    fallbackDecision.notes = `Fallback decision after runtime inspection failure: ${message}`;
    context.decisionArtifact = fallbackDecision;
    context.decisionPath = path.join(runPaths.decisionDir, `${context.artifactBaseName}.decision.json`);
    await persistDecisionArtifact(validator, fallbackDecision, context.decisionPath);

    lead.currentState = "DECISION_MADE";
    lead.notes = fallbackDecision.notes;
    await persistLeadArtifact(validator, lead, context.leadPath);

    manifestLead.currentState = "DECISION_MADE";
    manifestLead.decision = fallbackDecision.finalDecision;
    manifestLead.decisionRef = toArtifactRef(repoRoot, context.decisionPath);
    manifestLead.notes = fallbackDecision.notes;
  }
}

async function continueGenerationPlanning(params: {
  request: RunRequest;
  repoRoot: string;
  runPaths: ReturnType<typeof getRunPaths>;
  validator: SchemaValidator;
  runtimeLeads: RuntimeLeadContext[];
  manifest: RunManifest;
  auditLog: OperatorAuditLog;
}): Promise<boolean> {
  const { request, repoRoot, runPaths, validator, runtimeLeads, manifest, auditLog } = params;
  const buildableLeads = runtimeLeads.filter((context) =>
    isBuildableDecision(context.decisionArtifact?.finalDecision)
  );

  if (buildableLeads.length === 0) {
    addAuditEvent(auditLog, {
      eventType: "NOTE_ADDED",
      actorType: "system",
      notes: "Generation boundary requested but no buildable leads were eligible after decision."
    });
    await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
    return false;
  }

  const allowedBuildableLeads =
    request.safeLimits?.maxBuildableLeads && request.safeLimits.maxBuildableLeads > 0
      ? buildableLeads.slice(0, request.safeLimits.maxBuildableLeads)
      : buildableLeads;

  if (allowedBuildableLeads.length !== buildableLeads.length) {
    addAuditEvent(auditLog, {
      eventType: "NOTE_ADDED",
      actorType: "system",
      notes: `Applied safe limit maxBuildableLeads=${request.safeLimits?.maxBuildableLeads}; generation planning will continue for ${allowedBuildableLeads.length} of ${buildableLeads.length} buildable leads.`
    });

    for (const skippedContext of buildableLeads.slice(allowedBuildableLeads.length)) {
      const manifestLead = manifest.leads[skippedContext.manifestIndex];
      skippedContext.record.lead.currentState = "DECISION_MADE";
      skippedContext.record.lead.notes = appendNote(
        skippedContext.record.lead.notes,
        `Generation planning skipped because maxBuildableLeads=${request.safeLimits?.maxBuildableLeads} was reached.`
      );
      await persistLeadArtifact(validator, skippedContext.record.lead, skippedContext.leadPath);
      manifestLead.notes = appendNote(
        manifestLead.notes,
        `Generation planning skipped because maxBuildableLeads=${request.safeLimits?.maxBuildableLeads} was reached.`
      );
    }
  }

  const presets = await loadPresets(repoRoot, validator);
  const globalDefaults = presets.find((preset) => preset.id === "global-defaults");
  if (!globalDefaults) {
    throw new Error("Active preset set does not contain global-defaults.");
  }

  let partialFailure = false;

  for (const context of allowedBuildableLeads) {
    const manifestLead = manifest.leads[context.manifestIndex];
    try {
      if (!context.decisionArtifact || !context.snapshotResult || !context.qualificationArtifact) {
        throw new Error("Generation planning requires existing decision, qualification, and snapshot data.");
      }

      const selection = selectPrimaryPreset({
        lead: context.record.lead,
        qualification: context.qualificationArtifact,
        snapshotResult: context.snapshotResult,
        presets
      });

      addAuditEvent(auditLog, {
        eventType: "NOTE_ADDED",
        actorType: "system",
        leadKey: context.record.lead.leadKey,
        notes: selection.usedFallback
          ? `Preset resolution fell back to global-defaults. ${selection.notes.join(" ")}`
          : `Preset resolution selected ${selection.primaryPresetId}. ${selection.notes.join(" ")}`
      });

      const designSeed = resolveDesignSeed({
        decision: context.decisionArtifact,
        qualification: context.qualificationArtifact,
        snapshotResult: context.snapshotResult,
        request,
        globalDefaults,
        selection
      });
      context.designSeedArtifact = designSeed;
      context.designSeedPath = path.join(runPaths.designSeedsDir, `${context.artifactBaseName}.design-seed.json`);
      await persistDesignSeedArtifact(validator, designSeed, context.designSeedPath);

      const redesignBrief = buildRedesignBrief({
        decision: context.decisionArtifact,
        qualification: context.qualificationArtifact,
        snapshotResult: context.snapshotResult,
        designSeed,
        designSeedRef: toArtifactRef(repoRoot, context.designSeedPath)
      });
      context.redesignBriefArtifact = redesignBrief;
      context.redesignBriefPath = path.join(runPaths.briefsDir, `${context.artifactBaseName}.redesign-brief.json`);
      await persistRedesignBriefArtifact(validator, redesignBrief, context.redesignBriefPath);

      const demoBuildPlan = buildDemoBuildPlan({
        decision: context.decisionArtifact,
        designSeed,
        redesignBrief,
        qualification: context.qualificationArtifact,
        snapshotResult: context.snapshotResult,
        request,
        designSeedRef: toArtifactRef(repoRoot, context.designSeedPath),
        redesignBriefRef: toArtifactRef(repoRoot, context.redesignBriefPath)
      });
      context.demoBuildPlanArtifact = demoBuildPlan;
      context.demoBuildPlanPath = path.join(runPaths.buildPlansDir, `${context.artifactBaseName}.demo-build-plan.json`);
      await persistDemoBuildPlanArtifact(validator, demoBuildPlan, context.demoBuildPlanPath);

      context.designBriefProjectionPath = path.join(
        runPaths.designBriefProjectionDir,
        `${context.record.lead.leadKey}.DESIGN.md`
      );
      await renderDesignBriefProjection(redesignBrief, context.designBriefProjectionPath);

      context.record.lead.currentState = "GENERATING_DEMO";
      context.record.lead.notes = appendNote(context.record.lead.notes, "Generation-planning artifacts created.");
      await persistLeadArtifact(validator, context.record.lead, context.leadPath);

      manifestLead.currentState = "GENERATING_DEMO";
      manifestLead.designSeedRef = toArtifactRef(repoRoot, context.designSeedPath);
      manifestLead.redesignBriefRef = toArtifactRef(repoRoot, context.redesignBriefPath);
      manifestLead.demoBuildPlanRef = toArtifactRef(repoRoot, context.demoBuildPlanPath);
      manifestLead.notes = appendNote(
        manifestLead.notes,
        demoBuildPlan.generationReady
          ? "Generation-planning artifacts created."
          : `Generation-planning artifacts created with stop reasons: ${demoBuildPlan.stopReasons.join(", ")}.`
      );

      addAuditEvent(auditLog, {
        eventType: "NOTE_ADDED",
        actorType: "system",
        leadKey: context.record.lead.leadKey,
        artifactRefs: [
          { kind: "design-seed", ref: toArtifactRef(repoRoot, context.designSeedPath) },
          { kind: "redesign-brief", ref: toArtifactRef(repoRoot, context.redesignBriefPath) },
          { kind: "demo-build-plan", ref: toArtifactRef(repoRoot, context.demoBuildPlanPath) }
        ],
        notes: demoBuildPlan.generationReady
          ? "Generation-planning artifacts created for buildable lead."
          : `Generation-planning artifacts created but not generation-ready: ${demoBuildPlan.stopReasons.join(", ")}.`
      });
    } catch (error) {
      partialFailure = true;
      const message = error instanceof Error ? error.message : String(error);
      context.record.lead.currentState = "DECISION_MADE";
      context.record.lead.notes = appendNote(context.record.lead.notes, `Generation-planning failed: ${message}`);
      await persistLeadArtifact(validator, context.record.lead, context.leadPath);
      manifestLead.currentState = "DECISION_MADE";
      manifestLead.notes = appendNote(manifestLead.notes, `Generation-planning failed: ${message}`);
      addAuditEvent(auditLog, {
        eventType: "NOTE_ADDED",
        actorType: "system",
        leadKey: context.record.lead.leadKey,
        notes: `Generation-planning failed for buildable lead: ${message}`
      });
    }

    await persistManifest(validator, runPaths.manifestPath, manifest);
    await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
  }

  return partialFailure;
}

async function continuePreviewGeneration(params: {
  request: RunRequest;
  repoRoot: string;
  runId: string;
  runPaths: ReturnType<typeof getRunPaths>;
  validator: SchemaValidator;
  runtimeLeads: RuntimeLeadContext[];
  manifest: RunManifest;
  auditLog: OperatorAuditLog;
}): Promise<boolean> {
  const { request, repoRoot, runId, runPaths, validator, runtimeLeads, manifest, auditLog } = params;
  const previewCandidates = runtimeLeads.filter((context) =>
    isBuildableDecision(context.decisionArtifact?.finalDecision)
  );

  if (previewCandidates.length === 0) {
    addAuditEvent(auditLog, {
      eventType: "NOTE_ADDED",
      actorType: "system",
      notes: "Preview boundary requested but no buildable leads were eligible after decision."
    });
    await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
    return false;
  }

  const allowedPreviewLeads =
    request.safeLimits?.maxPreviewLeads && request.safeLimits.maxPreviewLeads > 0
      ? previewCandidates.slice(0, request.safeLimits.maxPreviewLeads)
      : previewCandidates;

  if (allowedPreviewLeads.length !== previewCandidates.length) {
    addAuditEvent(auditLog, {
      eventType: "NOTE_ADDED",
      actorType: "system",
      notes: `Applied safe limit maxPreviewLeads=${request.safeLimits?.maxPreviewLeads}; preview continuation will proceed for ${allowedPreviewLeads.length} of ${previewCandidates.length} buildable leads.`
    });

    for (const skippedContext of previewCandidates.slice(allowedPreviewLeads.length)) {
      const manifestLead = manifest.leads[skippedContext.manifestIndex];
      skippedContext.record.lead.notes = appendNote(
        skippedContext.record.lead.notes,
        `Preview generation skipped because maxPreviewLeads=${request.safeLimits?.maxPreviewLeads} was reached.`
      );
      await persistLeadArtifact(validator, skippedContext.record.lead, skippedContext.leadPath);
      manifestLead.notes = appendNote(
        manifestLead.notes,
        `Preview generation skipped because maxPreviewLeads=${request.safeLimits?.maxPreviewLeads} was reached.`
      );
    }
  }

  let partialFailure = false;

  for (const context of allowedPreviewLeads) {
    const manifestLead = manifest.leads[context.manifestIndex];
    const previewSiteDir = path.join(runPaths.previewSitesDir, context.record.lead.leadKey);
    const siteScaffoldDir = path.join(runPaths.siteScaffoldsDir, context.record.lead.leadKey);
    const stagingRoot = path.join(runPaths.runDir, ".staging", context.record.lead.leadKey);
    const previewStageDir = path.join(stagingRoot, "preview-site");
    const scaffoldStageDir = path.join(stagingRoot, "site-scaffold");
    context.previewManifestPath = path.join(runPaths.previewDir, `${context.record.lead.leadKey}.preview-manifest.json`);
    removeScaffoldArtifact(manifest, context.record.lead.leadKey);

    if (!hasCompleteGenerationArtifacts(context)) {
      const note = "Preview continuation skipped because required generation artifacts are missing for this lead.";
      context.record.lead.notes = appendNote(context.record.lead.notes, note);
      manifestLead.notes = appendNote(manifestLead.notes, note);
      await persistLeadArtifact(validator, context.record.lead, context.leadPath);
      addAuditEvent(auditLog, {
        eventType: "NOTE_ADDED",
        actorType: "system",
        leadKey: context.record.lead.leadKey,
        notes: note
      });
      await persistManifest(validator, runPaths.manifestPath, manifest);
      await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
      continue;
    }

    const previewBase = {
      runId,
      leadKey: context.record.lead.leadKey,
      decision: context.decisionArtifact.finalDecision,
      decisionRef: toArtifactRef(repoRoot, context.decisionPath!),
      designSeedRef: toArtifactRef(repoRoot, context.designSeedPath!),
      redesignBriefRef: toArtifactRef(repoRoot, context.redesignBriefPath!),
      demoBuildPlanRef: toArtifactRef(repoRoot, context.demoBuildPlanPath!),
      externalFlowHandling: context.redesignBriefArtifact.externalFlowHandling
    } as const;

    try {
      if (context.decisionArtifact.finalDecision === "DEMO_EDITABLE_CONTENT") {
        await fs.remove(previewSiteDir);
        await fs.remove(siteScaffoldDir);
        const blockedPath = path.join(previewSiteDir, "BLOCKED.txt");
        await writeTextFile(
          blockedPath,
          [
            "Preview bundle is blocked for this lead.",
            "",
            `leadKey: ${context.record.lead.leadKey}`,
            "reason: DEMO_EDITABLE_CONTENT actual preview is not implemented in this slice."
          ].join("\n")
        );
        const previewManifest = buildBlockedPreviewManifest(
          previewBase,
          blockedPath,
          ["GENERATION_BOUNDARY_VIOLATION"],
          "Preview remains blocked because actual editable demo runtime is not implemented in this slice."
        );
        await persistPreviewManifestArtifact(validator, previewManifest, context.previewManifestPath);
        manifestLead.previewManifestRef = toArtifactRef(repoRoot, context.previewManifestPath);
        manifestLead.notes = appendNote(
          manifestLead.notes,
          "Preview manifest recorded as blocked because editable preview runtime is not implemented."
        );
        context.record.lead.notes = appendNote(
          context.record.lead.notes,
          "Preview manifest recorded as blocked because editable preview runtime is not implemented."
        );
        await persistLeadArtifact(validator, context.record.lead, context.leadPath);
        addAuditEvent(auditLog, {
          eventType: "NOTE_ADDED",
          actorType: "system",
          leadKey: context.record.lead.leadKey,
          artifactRefs: [{ kind: "preview-manifest", ref: toArtifactRef(repoRoot, context.previewManifestPath) }],
          notes: "Preview manifest recorded as blocked for DEMO_EDITABLE_CONTENT."
        });
      } else {
        await fs.remove(stagingRoot);
        const previewResult = await generateFrontOnlyPreview({
          lead: context.record.lead,
          decision: context.decisionArtifact,
          designSeed: context.designSeedArtifact,
          redesignBrief: context.redesignBriefArtifact,
          demoBuildPlan: context.demoBuildPlanArtifact,
          snapshotResult: context.snapshotResult!,
          previewSiteDir: previewStageDir
        });

        if (previewResult.status === "blocked") {
          await fs.remove(previewSiteDir);
          await fs.remove(siteScaffoldDir);
          await fs.move(previewStageDir, previewSiteDir, { overwrite: true });

          const blockedPreviewPath = path.join(previewSiteDir, "BLOCKED.txt");
          const previewManifest = buildBlockedPreviewManifest(
            previewBase,
            blockedPreviewPath,
            previewResult.blockers,
            previewResult.notes
          );

          await persistPreviewManifestArtifact(validator, previewManifest, context.previewManifestPath);
          manifestLead.previewManifestRef = toArtifactRef(repoRoot, context.previewManifestPath);
          context.record.lead.currentState = "GENERATING_DEMO";
          manifestLead.currentState = "GENERATING_DEMO";
          context.record.lead.notes = appendNote(context.record.lead.notes, previewResult.notes);
          manifestLead.notes = appendNote(manifestLead.notes, previewResult.notes);
          addAuditEvent(auditLog, {
            eventType: "NOTE_ADDED",
            actorType: "system",
            leadKey: context.record.lead.leadKey,
            artifactRefs: [{ kind: "preview-manifest", ref: toArtifactRef(repoRoot, context.previewManifestPath) }],
            notes: `Preview manifest recorded as blocked: ${previewResult.notes}`
          });
          await persistLeadArtifact(validator, context.record.lead, context.leadPath);
        } else {
          const scaffoldResult = await generateSiteScaffold({
            lead: context.record.lead,
            qualification: context.qualificationArtifact!,
            decision: context.decisionArtifact,
            designSeed: context.designSeedArtifact,
            redesignBrief: context.redesignBriefArtifact,
            demoBuildPlan: context.demoBuildPlanArtifact,
            snapshotResult: context.snapshotResult!,
            scaffoldRoot: scaffoldStageDir,
            sourceRefs: {
              snapshotRef: context.snapshotPath ? toArtifactRef(repoRoot, context.snapshotPath) : undefined,
              qualificationRef: context.qualificationPath ? toArtifactRef(repoRoot, context.qualificationPath) : undefined,
              decisionRef: toArtifactRef(repoRoot, context.decisionPath),
              designSeedRef: toArtifactRef(repoRoot, context.designSeedPath),
              redesignBriefRef: toArtifactRef(repoRoot, context.redesignBriefPath),
              demoBuildPlanRef: toArtifactRef(repoRoot, context.demoBuildPlanPath),
              previewManifestRef: toArtifactRef(repoRoot, context.previewManifestPath)
            }
          });

          await fs.remove(previewSiteDir);
          await fs.remove(siteScaffoldDir);
          await fs.move(previewStageDir, previewSiteDir, { overwrite: true });
          await fs.move(scaffoldStageDir, siteScaffoldDir, { overwrite: true });

          const finalIndexPath = path.join(previewSiteDir, "index.html");
          const previewManifest = buildReadyPreviewManifest(
            previewBase,
            finalIndexPath,
            `${previewResult.notes} ${scaffoldResult.notes}`
          );

          await persistPreviewManifestArtifact(validator, previewManifest, context.previewManifestPath);
          manifestLead.previewManifestRef = toArtifactRef(repoRoot, context.previewManifestPath);
          upsertScaffoldArtifact(
            manifest,
            context.record.lead.leadKey,
            path.join(siteScaffoldDir, "README.md"),
            siteScaffoldDir
          );

          context.record.lead.currentState = "PREVIEW_READY";
          manifestLead.currentState = "PREVIEW_READY";
          context.record.lead.notes = appendNote(
            context.record.lead.notes,
            "Local static preview and draft Next scaffold generated for DEMO_FRONT_ONLY."
          );
          manifestLead.notes = appendNote(
            manifestLead.notes,
            "Local static preview and draft Next scaffold generated for DEMO_FRONT_ONLY."
          );
          addAuditEvent(auditLog, {
            eventType: "NOTE_ADDED",
            actorType: "system",
            leadKey: context.record.lead.leadKey,
            artifactRefs: [
              { kind: "preview-manifest", ref: toArtifactRef(repoRoot, context.previewManifestPath) },
              { kind: "site-scaffold", ref: toArtifactRef(repoRoot, path.join(siteScaffoldDir, "README.md")) }
            ],
            notes: "Local static preview bundle and draft Next scaffold generated for DEMO_FRONT_ONLY."
          });
          await persistLeadArtifact(validator, context.record.lead, context.leadPath);
        }
      }
    } catch (error) {
      partialFailure = true;
      const message = error instanceof Error ? error.message : String(error);
      await fs.remove(stagingRoot);
      await fs.remove(siteScaffoldDir);
      removeScaffoldArtifact(manifest, context.record.lead.leadKey);
      const failureNotePath = path.join(previewSiteDir, "FAILURE.txt");
      await fs.remove(previewSiteDir);
      await writeTextFile(
        failureNotePath,
        [
          "Preview generation failed for this lead.",
          "",
          `leadKey: ${context.record.lead.leadKey}`,
          `error: ${message}`
        ].join("\n")
      );

      const failedPreviewManifest = buildBlockedPreviewManifest(
        previewBase,
        failureNotePath,
        ["PREVIEW_BUILD_FAILED"],
        `Local preview generation failed unexpectedly: ${message}`,
        "failed"
      );
      await persistPreviewManifestArtifact(validator, failedPreviewManifest, context.previewManifestPath);
      manifestLead.previewManifestRef = toArtifactRef(repoRoot, context.previewManifestPath);
      manifestLead.currentState = "GENERATING_DEMO";
      manifestLead.notes = appendNote(manifestLead.notes, `Preview generation failed: ${message}`);
      context.record.lead.currentState = "GENERATING_DEMO";
      context.record.lead.notes = appendNote(context.record.lead.notes, `Preview generation failed: ${message}`);
      await persistLeadArtifact(validator, context.record.lead, context.leadPath);
      addAuditEvent(auditLog, {
        eventType: "NOTE_ADDED",
        actorType: "system",
        leadKey: context.record.lead.leadKey,
        artifactRefs: [{ kind: "preview-manifest", ref: toArtifactRef(repoRoot, context.previewManifestPath) }],
        notes: `Preview generation failed unexpectedly: ${message}`
      });
    }

    await fs.remove(stagingRoot);

    await persistManifest(validator, runPaths.manifestPath, manifest);
    await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
  }

  return partialFailure;
}

function isBuildableDecision(decision: DecisionArtifact["finalDecision"] | undefined): boolean {
  return decision === "DEMO_FRONT_ONLY" || decision === "DEMO_EDITABLE_CONTENT";
}

function hasCompleteGenerationArtifacts(context: RuntimeLeadContext): context is RuntimeLeadContext & {
  decisionArtifact: DecisionArtifact;
  designSeedArtifact: DesignSeedArtifact;
  redesignBriefArtifact: RedesignBriefArtifact;
  demoBuildPlanArtifact: DemoBuildPlanArtifact;
  snapshotResult: SnapshotExecutionResult;
  decisionPath: string;
  designSeedPath: string;
  redesignBriefPath: string;
  demoBuildPlanPath: string;
} {
  return Boolean(
    context.decisionArtifact &&
      context.designSeedArtifact &&
      context.redesignBriefArtifact &&
      context.demoBuildPlanArtifact &&
      context.snapshotResult &&
      context.decisionPath &&
      context.designSeedPath &&
      context.redesignBriefPath &&
      context.demoBuildPlanPath
  );
}

function appendNote(existing: string | undefined, note: string): string {
  return existing ? `${existing} ${note}` : note;
}

function upsertScaffoldArtifact(
  manifest: RunManifest,
  leadKey: string,
  scaffoldReadmePath: string,
  scaffoldRoot: string
): void {
  const readmeUri = pathToFileURL(scaffoldReadmePath).toString();
  const notes = `leadKey=${leadKey}; scaffoldRoot=${scaffoldRoot}`;
  const remaining = (manifest.artifacts ?? []).filter(
    (artifact) => !isScaffoldArtifactForLead(artifact, leadKey)
  );

  remaining.push({
    kind: "preview-bundle",
    locationKind: "local-doc",
    uri: readmeUri,
    notes
  });

  manifest.artifacts = remaining;
}

function removeScaffoldArtifact(manifest: RunManifest, leadKey: string): void {
  manifest.artifacts = (manifest.artifacts ?? []).filter(
    (artifact) => !isScaffoldArtifactForLead(artifact, leadKey)
  );
}

function isScaffoldArtifactForLead(
  artifact: NonNullable<RunManifest["artifacts"]>[number],
  leadKey: string
): boolean {
  return artifact.locationKind === "local-doc" && (artifact.notes?.includes(`leadKey=${leadKey}`) ?? false);
}

async function persistLeadArtifact(validator: SchemaValidator, lead: LeadArtifact, filePath: string): Promise<void> {
  await validator.validate("lead", lead);
  await writeJsonFile(filePath, lead);
}

async function persistQualificationArtifact(
  validator: SchemaValidator,
  qualification: Parameters<typeof writeJsonFile>[1] & object,
  filePath: string
): Promise<void> {
  await validator.validate("qualification", qualification);
  await writeJsonFile(filePath, qualification);
}

async function persistDecisionArtifact(validator: SchemaValidator, decision: DecisionArtifact, filePath: string): Promise<void> {
  await validator.validate("decision", decision);
  await writeJsonFile(filePath, decision);
}

async function persistDesignSeedArtifact(
  validator: SchemaValidator,
  designSeed: DesignSeedArtifact,
  filePath: string
): Promise<void> {
  await validator.validate("design-seed", designSeed);
  await writeJsonFile(filePath, designSeed);
}

async function persistRedesignBriefArtifact(
  validator: SchemaValidator,
  redesignBrief: RedesignBriefArtifact,
  filePath: string
): Promise<void> {
  await validator.validate("redesign-brief", redesignBrief);
  await writeJsonFile(filePath, redesignBrief);
}

async function persistDemoBuildPlanArtifact(
  validator: SchemaValidator,
  demoBuildPlan: DemoBuildPlanArtifact,
  filePath: string
): Promise<void> {
  await validator.validate("demo-build-plan", demoBuildPlan);
  await writeJsonFile(filePath, demoBuildPlan);
}

async function persistPreviewManifestArtifact(
  validator: SchemaValidator,
  previewManifest: PreviewManifestArtifact,
  filePath: string
): Promise<void> {
  await validator.validate("preview-manifest", previewManifest);
  await writeJsonFile(filePath, previewManifest);
}

async function persistManifest(validator: SchemaValidator, filePath: string, manifest: RunManifest): Promise<void> {
  await validator.validate("run-manifest", manifest);
  await writeJsonFile(filePath, manifest);
}

async function persistAuditLog(validator: SchemaValidator, filePath: string, auditLog: OperatorAuditLog): Promise<void> {
  auditLog.updatedAt = nowIso();
  await validator.validate("operator-audit-log", auditLog);
  await writeJsonFile(filePath, auditLog);
}

function createAuditLog(runId: string, timestamp: string): OperatorAuditLog {
  return {
    auditLogId: createId("audit-log", runId),
    runId,
    events: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function addAuditEvent(
  auditLog: OperatorAuditLog,
  event: Omit<OperatorAuditEvent, "eventId" | "timestamp">
): void {
  auditLog.events.push({
    eventId: createId("audit-event", `${auditLog.runId}-${auditLog.events.length + 1}`),
    timestamp: nowIso(),
    ...event
  });
  auditLog.updatedAt = nowIso();
}

function recalculateManifestCounts(manifest: RunManifest, runtimeLeads: RuntimeLeadContext[]): void {
  const decisions = manifest.leads.map((lead) => lead.decision);

  manifest.counts = {
    totalLeads: manifest.leads.length,
    withSite: runtimeLeads.filter((context) => context.record.lead.hasSite).length,
    skipped: decisions.filter((decision) => decision === "SKIP").length,
    auditOnly: decisions.filter((decision) => decision === "AUDIT_ONLY").length,
    demoFrontOnly: decisions.filter((decision) => decision === "DEMO_FRONT_ONLY").length,
    demoEditableContent: decisions.filter((decision) => decision === "DEMO_EDITABLE_CONTENT").length,
    previewReady: manifest.leads.filter((lead) => lead.currentState === "PREVIEW_READY").length
  };
}
