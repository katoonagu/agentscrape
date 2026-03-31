import { pathToFileURL } from "node:url";
import type {
  DecisionArtifact,
  PreviewBlocker,
  PreviewManifestArtifact,
  RedesignBriefArtifact
} from "../../../shared/src/contracts";
import { createId, nowIso } from "../../../shared/src/ids";

interface PreviewManifestBase {
  runId: string;
  leadKey: string;
  decision: DecisionArtifact["finalDecision"];
  decisionRef: string;
  designSeedRef: string;
  redesignBriefRef: string;
  demoBuildPlanRef: string;
  externalFlowHandling: RedesignBriefArtifact["externalFlowHandling"];
}

export function buildReadyPreviewManifest(
  base: PreviewManifestBase,
  indexPath: string,
  notes: string
): PreviewManifestArtifact {
  if (base.decision !== "DEMO_FRONT_ONLY" && base.decision !== "DEMO_EDITABLE_CONTENT") {
    throw new Error(`Preview manifest cannot be created for non-buildable decision ${base.decision}.`);
  }

  const fileUri = toFileUri(indexPath);

  return {
    previewId: createId("preview", `${base.runId}-${base.leadKey}`),
    runId: base.runId,
    leadKey: base.leadKey,
    decision: base.decision,
    decisionRef: base.decisionRef,
    designSeedRef: base.designSeedRef,
    redesignBriefRef: base.redesignBriefRef,
    demoBuildPlanRef: base.demoBuildPlanRef,
    provider: "local-static",
    status: "ready",
    deploymentKind: "external-artifact",
    previewUrl: fileUri,
    artifactUri: fileUri,
    generatedAt: nowIso(),
    buildStoredInRepo: false,
    externalFlowHandling: base.externalFlowHandling,
    notes
  };
}

export function buildBlockedPreviewManifest(
  base: PreviewManifestBase,
  notePath: string,
  blockers: PreviewBlocker[],
  notes: string,
  status: "blocked" | "failed" = "blocked"
): PreviewManifestArtifact {
  if (base.decision !== "DEMO_FRONT_ONLY" && base.decision !== "DEMO_EDITABLE_CONTENT") {
    throw new Error(`Preview manifest cannot be created for non-buildable decision ${base.decision}.`);
  }

  return {
    previewId: createId("preview", `${base.runId}-${base.leadKey}`),
    runId: base.runId,
    leadKey: base.leadKey,
    decision: base.decision,
    decisionRef: base.decisionRef,
    designSeedRef: base.designSeedRef,
    redesignBriefRef: base.redesignBriefRef,
    demoBuildPlanRef: base.demoBuildPlanRef,
    provider: "local-static",
    status,
    deploymentKind: "external-artifact",
    artifactUri: toFileUri(notePath),
    generatedAt: nowIso(),
    buildStoredInRepo: false,
    externalFlowHandling: base.externalFlowHandling,
    blockers,
    notes
  };
}

function toFileUri(filePath: string): string {
  return pathToFileURL(filePath).toString();
}
