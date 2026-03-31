import path from "node:path";

export interface RunPaths {
  runDir: string;
  manifestPath: string;
  runRequestPath: string;
  auditLogPath: string;
  leadsDir: string;
  snapshotsDir: string;
  qualificationDir: string;
  decisionDir: string;
  designSeedsDir: string;
  briefsDir: string;
  buildPlansDir: string;
  designBriefProjectionDir: string;
  previewDir: string;
  previewSitesDir: string;
  siteScaffoldsDir: string;
  screenshotsDir: string;
}

export function getRunPaths(repoRoot: string, runId: string): RunPaths {
  const runDir = path.join(repoRoot, ".artifacts", "runs", runId);

  return {
    runDir,
    manifestPath: path.join(runDir, "run-manifest.json"),
    runRequestPath: path.join(runDir, "control", "run-request.json"),
    auditLogPath: path.join(runDir, "control", "operator-audit-log.json"),
    leadsDir: path.join(runDir, "leads"),
    snapshotsDir: path.join(runDir, "snapshots"),
    qualificationDir: path.join(runDir, "qualification"),
    decisionDir: path.join(runDir, "decision"),
    designSeedsDir: path.join(runDir, "design-seeds"),
    briefsDir: path.join(runDir, "briefs"),
    buildPlansDir: path.join(runDir, "build-plans"),
    designBriefProjectionDir: path.join(runDir, "projections", "design-brief"),
    previewDir: path.join(runDir, "preview"),
    previewSitesDir: path.join(runDir, "preview-sites"),
    siteScaffoldsDir: path.join(runDir, "site-scaffolds"),
    screenshotsDir: path.join(runDir, "screenshots")
  };
}

export function toArtifactRef(repoRoot: string, absolutePath: string): string {
  const relativePath = path.relative(repoRoot, absolutePath);
  return relativePath.split(path.sep).join("/");
}
