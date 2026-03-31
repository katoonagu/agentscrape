import path from "node:path";
import fs from "fs-extra";
import { chromium, type Browser } from "playwright";
import type {
  DecisionArtifact,
  DemoBuildPlanArtifact,
  DesignSeedArtifact,
  LeadArtifact,
  OperatorAuditEvent,
  OperatorAuditLog,
  QualificationArtifact,
  RedesignBriefArtifact,
  RunManifest,
  RunManifestLeadEntry,
  RunRequest,
  RunState,
  SiteSnapshotArtifact
} from "../../../shared/src/contracts";
import { readJsonFile, writeJsonFile, ensureDirectory } from "../../../shared/src/fs";
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
  screenshotDir: string;
  manifestIndex: number;
  snapshotArtifact?: SiteSnapshotArtifact;
  snapshotResult?: SnapshotExecutionResult;
  qualificationArtifact?: QualificationArtifact;
  decisionArtifact?: DecisionArtifact;
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
    }
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
    if (request.executionBoundary === "generation") {
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

    manifest.runState = generationPartialFailure ? "PARTIAL_DONE" : "RUN_DONE";
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

  if (!["decision", "generation"].includes(request.executionBoundary)) {
    throw new Error(
      `Unsupported executionBoundary "${request.executionBoundary}". This slice implements only "decision" and "generation".`
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
      context.designSeedPath = path.join(runPaths.designSeedsDir, `${context.artifactBaseName}.design-seed.json`);
      await persistDesignSeedArtifact(validator, designSeed, context.designSeedPath);

      const redesignBrief = buildRedesignBrief({
        decision: context.decisionArtifact,
        qualification: context.qualificationArtifact,
        snapshotResult: context.snapshotResult,
        designSeed,
        designSeedRef: toArtifactRef(repoRoot, context.designSeedPath)
      });
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

function isBuildableDecision(decision: DecisionArtifact["finalDecision"] | undefined): boolean {
  return decision === "DEMO_FRONT_ONLY" || decision === "DEMO_EDITABLE_CONTENT";
}

function appendNote(existing: string | undefined, note: string): string {
  return existing ? `${existing} ${note}` : note;
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
    previewReady: 0
  };
}
