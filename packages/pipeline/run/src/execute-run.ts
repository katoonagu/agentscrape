import path from "node:path";
import fs from "fs-extra";
import { chromium, type Browser } from "playwright";
import type {
  DecisionArtifact,
  LeadArtifact,
  OperatorAuditEvent,
  OperatorAuditLog,
  RunManifest,
  RunManifestLeadEntry,
  RunRequest,
  RunState
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

interface RuntimeLeadContext {
  record: NormalizedLeadRecord;
  leadPath: string;
  snapshotPath?: string;
  qualificationPath?: string;
  decisionPath?: string;
  screenshotDir: string;
  manifestIndex: number;
}

export async function executeRun(requestPath: string, repoRoot: string): Promise<{ runId: string; runDir: string }> {
  const validator = new SchemaValidator(repoRoot);
  const rawRequest = await readJsonFile<unknown>(requestPath);
  const request = await validator.validate("run-request", rawRequest);

  assertRuntimeSupport(request);

  const runId = createRunId(request.requestId);
  const runPaths = getRunPaths(repoRoot, runId);
  const createdAt = nowIso();

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

    manifest.runState = "RUN_DONE";
    recalculateManifestCounts(manifest, runtimeLeads);
    await persistManifest(validator, runPaths.manifestPath, manifest);
    await persistAuditLog(validator, runPaths.auditLogPath, auditLog);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return { runId, runDir: runPaths.runDir };
}

function assertRuntimeSupport(request: RunRequest): void {
  if (request.inputMode !== "manual-list") {
    throw new Error(`Unsupported inputMode "${request.inputMode}". This slice implements only "manual-list".`);
  }

  if (request.executionBoundary !== "decision") {
    throw new Error(
      `Unsupported executionBoundary "${request.executionBoundary}". This slice stops only at "decision".`
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

    return {
      record,
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
    context.decisionPath = path.join(runPaths.decisionDir, `${path.parse(context.record.artifactFileName).name}.decision.json`);
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
    context.snapshotPath = path.join(runPaths.snapshotsDir, `${path.parse(context.record.artifactFileName).name}.site-snapshot.json`);
    await validator.validate("site-snapshot", snapshotResult.artifact);
    await writeJsonFile(context.snapshotPath, snapshotResult.artifact);

    const qualification = qualifyLead({
      lead,
      snapshotResult,
      snapshotRef: toArtifactRef(repoRoot, context.snapshotPath)
    });
    context.qualificationPath = path.join(
      runPaths.qualificationDir,
      `${path.parse(context.record.artifactFileName).name}.qualification.json`
    );
    await persistQualificationArtifact(validator, qualification, context.qualificationPath);

    const decision = decideLead({
      lead,
      qualification,
      snapshotResult
    });

    context.decisionPath = path.join(runPaths.decisionDir, `${path.parse(context.record.artifactFileName).name}.decision.json`);
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
    context.decisionPath = path.join(runPaths.decisionDir, `${path.parse(context.record.artifactFileName).name}.decision.json`);
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
