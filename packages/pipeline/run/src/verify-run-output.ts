import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import type {
  PipelineDecision,
  PreviewManifestArtifact,
  RunManifest,
  RunManifestLeadEntry,
  RunRequest
} from "../../../shared/src/contracts";
import { pathExists, readJsonFile, readTextFile } from "../../../shared/src/fs";
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
  const previewManifests = await loadPreviewManifests(repoRoot, manifest, validator, issues);

  await validateManifestRefs(repoRoot, manifest, issues);
  validateDecisionGenerationConsistency(manifest, runRequest, previewManifests, issues);
  await validateGenerationDirectories(repoRoot, resolved.runDir, manifest, runRequest, issues);
  await validatePreviewDirectories(repoRoot, resolved.runDir, manifest, runRequest, previewManifests, issues);
  await validateScaffoldDirectories(repoRoot, resolved.runDir, manifest, previewManifests, issues);

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

async function loadPreviewManifests(
  repoRoot: string,
  manifest: RunManifest,
  validator: SchemaValidator,
  issues: VerificationIssue[]
): Promise<Map<string, PreviewManifestArtifact>> {
  const previewManifests = new Map<string, PreviewManifestArtifact>();

  for (const lead of manifest.leads) {
    if (!lead.previewManifestRef) {
      continue;
    }

    const previewPath = resolveArtifactRef(repoRoot, lead.previewManifestRef);
    if (!(await pathExists(previewPath))) {
      issues.push({
        severity: "fail",
        message: `previewManifestRef points to a missing file for ${lead.leadKey}: ${lead.previewManifestRef}`
      });
      continue;
    }

    const rawPreviewManifest = await readJsonFile<unknown>(previewPath);
    const previewManifest = await validator.validate("preview-manifest", rawPreviewManifest);
    previewManifests.set(lead.leadKey, previewManifest);
  }

  return previewManifests;
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
  previewManifests: Map<string, PreviewManifestArtifact>,
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

    const previewManifest = previewManifests.get(lead.leadKey);

    if ((lead.decision === "SKIP" || lead.decision === "AUDIT_ONLY") && (lead.previewManifestRef || previewManifest)) {
      issues.push({
        severity: "fail",
        message: `Lead ${lead.leadKey} has preview artifacts despite decision=${lead.decision}.`
      });
    }

    if (previewManifest && !isBuildable) {
      issues.push({
        severity: "fail",
        message: `Lead ${lead.leadKey} has preview artifacts but decision is not buildable.`
      });
    }

    if (previewManifest && !hasCompleteGenerationSet) {
      issues.push({
        severity: "fail",
        message: `Lead ${lead.leadKey} has preview artifacts without the full generation ref set in run-manifest.`
      });
    }

    if (previewManifest?.status === "ready" && lead.decision !== "DEMO_FRONT_ONLY") {
      issues.push({
        severity: "fail",
        message: `Lead ${lead.leadKey} has a ready preview-manifest but decision=${lead.decision}.`
      });
    }

    if (lead.decision === "DEMO_EDITABLE_CONTENT" && previewManifest && previewManifest.status !== "blocked") {
      issues.push({
        severity: "fail",
        message: `Lead ${lead.leadKey} may only have a blocked preview-manifest in this slice.`
      });
    }

    if (
      executionBoundary === "preview" &&
      isBuildable &&
      !previewManifest &&
      !hasPreviewSkipNote(lead.notes)
    ) {
      issues.push({
        severity: "warn",
        message: `Buildable lead ${lead.leadKey} has no preview-manifest for a preview-boundary run.`
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

async function validatePreviewDirectories(
  repoRoot: string,
  runDir: string,
  manifest: RunManifest,
  runRequest: RunRequest | null,
  previewManifests: Map<string, PreviewManifestArtifact>,
  issues: VerificationIssue[]
): Promise<void> {
  const expectedPreviewManifestFiles = new Set<string>();
  const expectedPreviewSiteFiles = new Set<string>();

  for (const lead of manifest.leads) {
    if (lead.previewManifestRef) {
      expectedPreviewManifestFiles.add(normalizeAbsolutePath(resolveArtifactRef(repoRoot, lead.previewManifestRef)));
    }

    const previewManifest = previewManifests.get(lead.leadKey);
    if (!previewManifest) {
      continue;
    }

    if (previewManifest.provider !== "local-static") {
      issues.push({
        severity: "warn",
        message: `Preview provider for ${lead.leadKey} is ${previewManifest.provider}; verifier assumes local-static for this slice.`
      });
    }

    if (!previewManifest.artifactUri || !isFileUri(previewManifest.artifactUri)) {
      issues.push({
        severity: "fail",
        message: `Preview manifest for ${lead.leadKey} must point to a local file artifact URI in this slice.`
      });
      continue;
    }

    const artifactPath = normalizeAbsolutePath(fileURLToPath(previewManifest.artifactUri));
    expectedPreviewSiteFiles.add(artifactPath);

    if (previewManifest.status === "ready") {
      if (!previewManifest.previewUrl || !isFileUri(previewManifest.previewUrl)) {
        issues.push({
          severity: "fail",
          message: `Ready preview for ${lead.leadKey} must expose a local file previewUrl in this slice.`
        });
      }

      const previewDir = path.dirname(artifactPath);
      expectedPreviewSiteFiles.add(normalizeAbsolutePath(path.join(previewDir, "index.html")));
      expectedPreviewSiteFiles.add(normalizeAbsolutePath(path.join(previewDir, "styles.css")));
    }
  }

  await compareDirectoryToExpected(
    path.join(runDir, "preview"),
    expectedPreviewManifestFiles,
    "preview",
    issues
  );
  await compareDirectoryToExpected(
    path.join(runDir, "preview-sites"),
    expectedPreviewSiteFiles,
    "preview-sites",
    issues
  );

  if (runRequest?.executionBoundary !== "preview" && (expectedPreviewManifestFiles.size > 0 || expectedPreviewSiteFiles.size > 0)) {
    issues.push({
      severity: "fail",
      message: `${runRequest?.executionBoundary ?? "unknown"}-boundary run contains preview artifacts, which indicates stale carry-over or an invalid runtime path.`
    });
  }
}

async function validateScaffoldDirectories(
  repoRoot: string,
  runDir: string,
  manifest: RunManifest,
  previewManifests: Map<string, PreviewManifestArtifact>,
  issues: VerificationIssue[]
): Promise<void> {
  const expectedScaffoldFiles = new Set<string>();
  const expectedReadmeByLead = new Map<string, string>();
  const scaffoldArtifactEntries = getScaffoldArtifactEntries(manifest);
  const expectedEligibleLeads = new Set<string>();

  for (const lead of manifest.leads) {
    const previewManifest = previewManifests.get(lead.leadKey);
    const isReadyFrontOnly = lead.decision === "DEMO_FRONT_ONLY" && previewManifest?.status === "ready";

    if (isReadyFrontOnly) {
      expectedEligibleLeads.add(lead.leadKey);
      const scaffoldRoot = path.join(runDir, "site-scaffolds", lead.leadKey);
      for (const filePath of getExpectedScaffoldFiles(scaffoldRoot)) {
        expectedScaffoldFiles.add(normalizeAbsolutePath(filePath));
      }

      const expectedReadmePath = normalizeAbsolutePath(path.join(scaffoldRoot, "README.md"));
      expectedReadmeByLead.set(lead.leadKey, expectedReadmePath);

      const artifactEntry = scaffoldArtifactEntries.get(lead.leadKey);
      if (!artifactEntry) {
        issues.push({
          severity: "fail",
          message: `Preview-ready DEMO_FRONT_ONLY lead ${lead.leadKey} is missing its scaffold artifact entry in run-manifest.artifacts[].`
        });
      } else {
        if (artifactEntry.locationKind !== "local-doc" || artifactEntry.kind !== "preview-bundle") {
          issues.push({
            severity: "fail",
            message: `Scaffold artifact entry for ${lead.leadKey} must use kind=preview-bundle and locationKind=local-doc.`
          });
        }

        if (!isFileUri(artifactEntry.uri)) {
          issues.push({
            severity: "fail",
            message: `Scaffold artifact entry for ${lead.leadKey} must use a file:// URI.`
          });
        } else {
          const artifactPath = normalizeAbsolutePath(fileURLToPath(artifactEntry.uri));
          if (artifactPath !== expectedReadmePath) {
            issues.push({
              severity: "fail",
              message: `Scaffold artifact entry for ${lead.leadKey} must point to ${expectedReadmePath}, got ${artifactPath}.`
            });
          }
        }
      }
    } else if (lead.decision === "DEMO_EDITABLE_CONTENT" && previewManifest) {
      const artifactEntry = scaffoldArtifactEntries.get(lead.leadKey);
      if (artifactEntry) {
        issues.push({
          severity: "fail",
          message: `DEMO_EDITABLE_CONTENT lead ${lead.leadKey} must not have a site scaffold artifact entry in this slice.`
        });
      }
    }
  }

  for (const [leadKey] of scaffoldArtifactEntries) {
    if (!expectedEligibleLeads.has(leadKey)) {
      issues.push({
        severity: "fail",
        message: `run-manifest.artifacts[] contains a scaffold entry for non-eligible lead ${leadKey}.`
      });
    }
  }

  await compareDirectoryToExpected(
    path.join(runDir, "site-scaffolds"),
    expectedScaffoldFiles,
    "site-scaffolds",
    issues
  );

  for (const [leadKey, readmePath] of expectedReadmeByLead) {
    const scaffoldRoot = path.dirname(readmePath);
    const scaffoldFiles = getExpectedScaffoldFiles(scaffoldRoot);
    for (const filePath of scaffoldFiles) {
      const normalizedPath = normalizeAbsolutePath(filePath);
      if (!(await pathExists(normalizedPath))) {
        continue;
      }

      const contents = await readTextFile(normalizedPath);
      const bannedMarker = findBannedStubMarker(contents);
      if (bannedMarker) {
        issues.push({
          severity: "fail",
          message: `Scaffold file for ${leadKey} contains a banned stub marker (${bannedMarker}): ${normalizedPath}`
        });
      }
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

function getExpectedScaffoldFiles(scaffoldRoot: string): string[] {
  return [
    path.join(scaffoldRoot, "package.json"),
    path.join(scaffoldRoot, "tsconfig.json"),
    path.join(scaffoldRoot, "next-env.d.ts"),
    path.join(scaffoldRoot, "app", "layout.tsx"),
    path.join(scaffoldRoot, "app", "page.tsx"),
    path.join(scaffoldRoot, "app", "globals.css"),
    path.join(scaffoldRoot, "components", "site", "DraftBanner.tsx"),
    path.join(scaffoldRoot, "components", "site", "HeroSection.tsx"),
    path.join(scaffoldRoot, "components", "site", "ServicesSection.tsx"),
    path.join(scaffoldRoot, "components", "site", "TrustSection.tsx"),
    path.join(scaffoldRoot, "components", "site", "ContactSection.tsx"),
    path.join(scaffoldRoot, "components", "site", "PlannedPagesNav.tsx"),
    path.join(scaffoldRoot, "components", "site", "types.ts"),
    path.join(scaffoldRoot, "content", "site-content.json"),
    path.join(scaffoldRoot, "DESIGN.md"),
    path.join(scaffoldRoot, "README.md")
  ];
}

function getScaffoldArtifactEntries(
  manifest: RunManifest
): Map<string, NonNullable<RunManifest["artifacts"]>[number]> {
  const result = new Map<string, NonNullable<RunManifest["artifacts"]>[number]>();

  for (const artifact of manifest.artifacts ?? []) {
    if (artifact.locationKind !== "local-doc" || !isFileUri(artifact.uri)) {
      continue;
    }

    const leadKey = artifact.notes?.match(/leadKey=([^;]+)/u)?.[1];
    if (!leadKey) {
      continue;
    }

    const normalizedPath = normalizeAbsolutePath(fileURLToPath(artifact.uri));
    if (!normalizedPath.includes(`${path.sep}site-scaffolds${path.sep}`)) {
      continue;
    }

    result.set(leadKey, artifact);
  }

  return result;
}

function findBannedStubMarker(contents: string): string | null {
  const patterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "TODO", pattern: /\bTODO\b/u },
    { label: "implement here", pattern: /\bimplement here\b/iu },
    { label: "rest of code", pattern: /\brest of code\b/iu },
    { label: "continue pattern", pattern: /\bcontinue pattern\b/iu },
    { label: "add more as needed", pattern: /\badd more as needed\b/iu },
    { label: "omission ellipsis", pattern: /^\s*\.\.\.\s*$/mu }
  ];

  for (const entry of patterns) {
    if (entry.pattern.test(contents)) {
      return entry.label;
    }
  }

  return null;
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

function isFileUri(value: string): boolean {
  return value.startsWith("file://");
}

function hasPreviewSkipNote(notes: string | undefined): boolean {
  if (!notes) {
    return false;
  }

  return /maxPreviewLeads|Preview generation skipped|Preview continuation skipped/iu.test(notes);
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
