import path from "node:path";
import fs from "fs-extra";
import type {
  PipelineDecision,
  RunManifest,
  RunManifestLeadEntry,
  RunRequest
} from "../../../shared/src/contracts";
import { pathExists, readJsonFile } from "../../../shared/src/fs";
import { SchemaValidator } from "../../../shared/src/schema";

export type VerificationStatus = "pass" | "warn" | "fail";

export interface VerificationIssue {
  severity: Exclude<VerificationStatus, "pass">;
  message: string;
}

export interface RunOutputVerificationResult {
  status: VerificationStatus;
  runDir: string;
  issues: VerificationIssue[];
}

interface ResolvedRunContext {
  runDir: string;
  manifestPath: string;
  auditLogPath: string;
}

export async function verifyRunOutput(params: {
  repoRoot: string;
  target: string;
}): Promise<RunOutputVerificationResult> {
  const { repoRoot, target } = params;
  const issues: VerificationIssue[] = [];
  const validator = new SchemaValidator(repoRoot);
  const resolved = await resolveRunContext(repoRoot, target);

  if (!(await pathExists(resolved.runDir))) {
    return failResult(resolved.runDir, [`Run directory does not exist: ${resolved.runDir}`]);
  }

  if (!(await pathExists(resolved.manifestPath))) {
    return failResult(resolved.runDir, [`Missing run-manifest.json: ${resolved.manifestPath}`]);
  }

  if (!(await pathExists(resolved.auditLogPath))) {
    return failResult(resolved.runDir, [`Missing operator-audit-log.json: ${resolved.auditLogPath}`]);
  }

  const rawManifest = await readJsonFile<unknown>(resolved.manifestPath);
  const manifest = await validator.validate("run-manifest", rawManifest);

  const rawAuditLog = await readJsonFile<unknown>(resolved.auditLogPath);
  await validator.validate("operator-audit-log", rawAuditLog);

  const runRequest = await loadOptionalRunRequest(repoRoot, manifest, validator, issues);

  await validateManifestRefs(repoRoot, manifest, issues);
  validateDecisionGenerationConsistency(manifest, runRequest, issues);
  await validateGenerationDirectories(repoRoot, resolved.runDir, manifest, runRequest, issues);

  return {
    status: deriveStatus(issues),
    runDir: resolved.runDir,
    issues
  };
}

async function resolveRunContext(repoRoot: string, target: string): Promise<ResolvedRunContext> {
  const directCandidate = path.isAbsolute(target) ? target : path.resolve(repoRoot, target);
  const runDir = (await pathExists(directCandidate))
    ? directCandidate
    : path.join(repoRoot, ".artifacts", "runs", target);

  return {
    runDir,
    manifestPath: path.join(runDir, "run-manifest.json"),
    auditLogPath: path.join(runDir, "control", "operator-audit-log.json")
  };
}

async function loadOptionalRunRequest(
  repoRoot: string,
  manifest: RunManifest,
  validator: SchemaValidator,
  issues: VerificationIssue[]
): Promise<RunRequest | null> {
  if (!manifest.runRequestRef) {
    issues.push({
      severity: "warn",
      message: "run-manifest does not include runRequestRef; executionBoundary-specific verification is limited."
    });
    return null;
  }

  const requestPath = resolveArtifactRef(repoRoot, manifest.runRequestRef);
  if (!(await pathExists(requestPath))) {
    issues.push({
      severity: "fail",
      message: `runRequestRef points to a missing file: ${manifest.runRequestRef}`
    });
    return null;
  }

  const rawRequest = await readJsonFile<unknown>(requestPath);
  return validator.validate("run-request", rawRequest);
}

async function validateManifestRefs(
  repoRoot: string,
  manifest: RunManifest,
  issues: VerificationIssue[]
): Promise<void> {
  const refs: Array<{ label: string; ref: string }> = [];

  pushRef(refs, "runRequestRef", manifest.runRequestRef);
  pushRef(refs, "operatorAuditLogRef", manifest.operatorAuditLogRef);
  for (const [index, ref] of (manifest.approvalRequestRefs ?? []).entries()) {
    pushRef(refs, `approvalRequestRefs[${index}]`, ref);
  }
  for (const [index, ref] of (manifest.approvalResponseRefs ?? []).entries()) {
    pushRef(refs, `approvalResponseRefs[${index}]`, ref);
  }

  for (const lead of manifest.leads) {
    pushRef(refs, `${lead.leadKey}.leadRef`, lead.leadRef);
    pushRef(refs, `${lead.leadKey}.qualificationRef`, lead.qualificationRef);
    pushRef(refs, `${lead.leadKey}.decisionRef`, lead.decisionRef);
    pushRef(refs, `${lead.leadKey}.designSeedRef`, lead.designSeedRef);
    pushRef(refs, `${lead.leadKey}.redesignBriefRef`, lead.redesignBriefRef);
    pushRef(refs, `${lead.leadKey}.demoBuildPlanRef`, lead.demoBuildPlanRef);
    pushRef(refs, `${lead.leadKey}.previewManifestRef`, lead.previewManifestRef);
    pushRef(refs, `${lead.leadKey}.reviewDossierRef`, lead.reviewDossierRef);
    for (const [index, ref] of (lead.operatorOverrideRefs ?? []).entries()) {
      pushRef(refs, `${lead.leadKey}.operatorOverrideRefs[${index}]`, ref);
    }
  }

  for (const entry of refs) {
    const absolutePath = resolveArtifactRef(repoRoot, entry.ref);
    if (!(await pathExists(absolutePath))) {
      issues.push({
        severity: "fail",
        message: `${entry.label} points to a missing file: ${entry.ref}`
      });
    }
  }
}

function validateDecisionGenerationConsistency(
  manifest: RunManifest,
  runRequest: RunRequest | null,
  issues: VerificationIssue[]
): void {
  const executionBoundary = runRequest?.executionBoundary;

  for (const lead of manifest.leads) {
    const generationRefs = getGenerationRefs(lead);
    const hasAnyGenerationRef = generationRefs.length > 0;
    const hasCompleteGenerationSet = generationRefs.length === 3;
    const isBuildable = lead.decision === "DEMO_FRONT_ONLY" || lead.decision === "DEMO_EDITABLE_CONTENT";

    if ((lead.decision === "SKIP" || lead.decision === "AUDIT_ONLY") && hasAnyGenerationRef) {
      issues.push({
        severity: "fail",
        message: `Lead ${lead.leadKey} has generation refs despite decision=${lead.decision}.`
      });
    }

    if (!isBuildable && hasAnyGenerationRef) {
      issues.push({
        severity: "fail",
        message: `Lead ${lead.leadKey} has generation refs but decision is not buildable.`
      });
    }

    if (hasAnyGenerationRef && !hasCompleteGenerationSet) {
      issues.push({
        severity: "fail",
        message: `Lead ${lead.leadKey} has an incomplete generation ref set; all of designSeedRef, redesignBriefRef, and demoBuildPlanRef must exist together.`
      });
    }

    if (executionBoundary === "generation" && isBuildable && !hasAnyGenerationRef) {
      issues.push({
        severity: "warn",
        message: lead.notes
          ? `Buildable lead ${lead.leadKey} stopped before generation refs were written: ${lead.notes}`
          : `Buildable lead ${lead.leadKey} has no generation refs for a generation-boundary run.`
      });
    }
  }
}

async function validateGenerationDirectories(
  repoRoot: string,
  runDir: string,
  manifest: RunManifest,
  runRequest: RunRequest | null,
  issues: VerificationIssue[]
): Promise<void> {
  const expectedDesignSeedFiles = new Set<string>();
  const expectedBriefFiles = new Set<string>();
  const expectedBuildPlanFiles = new Set<string>();
  const expectedProjectionFiles = new Set<string>();

  for (const lead of manifest.leads) {
    if (lead.designSeedRef) {
      expectedDesignSeedFiles.add(normalizeAbsolutePath(resolveArtifactRef(repoRoot, lead.designSeedRef)));
    }
    if (lead.redesignBriefRef) {
      expectedBriefFiles.add(normalizeAbsolutePath(resolveArtifactRef(repoRoot, lead.redesignBriefRef)));
    }
    if (lead.demoBuildPlanRef) {
      expectedBuildPlanFiles.add(normalizeAbsolutePath(resolveArtifactRef(repoRoot, lead.demoBuildPlanRef)));
    }

    const hasCompleteGenerationSet = getGenerationRefs(lead).length === 3;
    if (hasCompleteGenerationSet) {
      expectedProjectionFiles.add(
        normalizeAbsolutePath(path.join(runDir, "projections", "design-brief", `${lead.leadKey}.DESIGN.md`))
      );
    }
  }

  await compareDirectoryToExpected(
    path.join(runDir, "design-seeds"),
    expectedDesignSeedFiles,
    "design-seeds",
    issues
  );
  await compareDirectoryToExpected(
    path.join(runDir, "briefs"),
    expectedBriefFiles,
    "briefs",
    issues
  );
  await compareDirectoryToExpected(
    path.join(runDir, "build-plans"),
    expectedBuildPlanFiles,
    "build-plans",
    issues
  );
  await compareDirectoryToExpected(
    path.join(runDir, "projections", "design-brief"),
    expectedProjectionFiles,
    "projections/design-brief",
    issues
  );

  if (runRequest?.executionBoundary === "decision") {
    const actualGenerationFileCount =
      expectedDesignSeedFiles.size + expectedBriefFiles.size + expectedBuildPlanFiles.size + expectedProjectionFiles.size;
    if (actualGenerationFileCount > 0) {
      issues.push({
        severity: "fail",
        message: "Decision-boundary run contains generation artifacts, which indicates stale carry-over or an invalid runtime path."
      });
    }
  }
}

async function compareDirectoryToExpected(
  dirPath: string,
  expectedFiles: Set<string>,
  label: string,
  issues: VerificationIssue[]
): Promise<void> {
  const actualFiles = await listFilesRecursive(dirPath);
  const normalizedActualFiles = new Set(actualFiles.map(normalizeAbsolutePath));

  for (const expectedFile of expectedFiles) {
    if (!normalizedActualFiles.has(expectedFile)) {
      issues.push({
        severity: "fail",
        message: `Missing expected file in ${label}: ${expectedFile}`
      });
    }
  }

  for (const actualFile of normalizedActualFiles) {
    if (!expectedFiles.has(actualFile)) {
      issues.push({
        severity: "fail",
        message: `Unexpected stale or untracked file in ${label}: ${actualFile}`
      });
    }
  }
}

async function listFilesRecursive(dirPath: string): Promise<string[]> {
  if (!(await pathExists(dirPath))) {
    return [];
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function getGenerationRefs(lead: RunManifestLeadEntry): string[] {
  return [lead.designSeedRef, lead.redesignBriefRef, lead.demoBuildPlanRef].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
}

function pushRef(target: Array<{ label: string; ref: string }>, label: string, ref: string | undefined): void {
  if (typeof ref === "string" && ref.length > 0) {
    target.push({ label, ref });
  }
}

function resolveArtifactRef(repoRoot: string, ref: string): string {
  return path.resolve(repoRoot, ref);
}

function normalizeAbsolutePath(filePath: string): string {
  return path.normalize(filePath);
}

function deriveStatus(issues: VerificationIssue[]): VerificationStatus {
  if (issues.some((issue) => issue.severity === "fail")) {
    return "fail";
  }

  if (issues.some((issue) => issue.severity === "warn")) {
    return "warn";
  }

  return "pass";
}

function failResult(runDir: string, messages: string[]): RunOutputVerificationResult {
  return {
    status: "fail",
    runDir,
    issues: messages.map((message) => ({
      severity: "fail" as const,
      message
    }))
  };
}
