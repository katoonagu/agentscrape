import type {
  AppliedLayer,
  DecisionArtifact,
  DesignSeedArtifact,
  DesignSeedConfidence,
  EditableBlock,
  NichePreset,
  QualificationArtifact,
  RunRequest
} from "../../../shared/src/contracts";
import { createId } from "../../../shared/src/ids";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";
import type { PresetSelectionResult } from "./select-primary-preset";

export function resolveDesignSeed(params: {
  decision: DecisionArtifact;
  qualification: QualificationArtifact;
  snapshotResult: SnapshotExecutionResult;
  request: RunRequest;
  globalDefaults: NichePreset;
  selection: PresetSelectionResult;
}): DesignSeedArtifact {
  const { decision, qualification, snapshotResult, request, globalDefaults, selection } = params;
  const appliedPreset = selection.primaryPreset;
  const brandClues = inferBrandClues(snapshotResult);
  const operatorReferencesUsed = Boolean(request.operatorNotes || request.operatorReferences?.length);
  const chosenScore = selection.scoreBreakdown.find((entry) => entry.presetId === appliedPreset.id);
  const hasDirectionConflict = Boolean(chosenScore && chosenScore.matchedNegativeSignals.length > 0);
  const seedConfidence = determineSeedConfidence(selection, qualification, hasDirectionConflict);

  const appliedLayers: AppliedLayer[] = ["global-defaults"];
  if (appliedPreset.id !== globalDefaults.id) {
    appliedLayers.push("niche-preset");
  }
  if (brandClues.strength !== "weak") {
    appliedLayers.push("existing-brand");
  }
  if (
    snapshotResult.artifact.selectionMode === "ONE_PAGE_VIRTUAL_SECTIONS" ||
    decision.preserveExternalFlow ||
    qualification.scores.contentSufficiency <= 5
  ) {
    appliedLayers.push("lead-override");
  }

  const sourceNotes = [
    ...selection.notes,
    `Brand clue strength assessed as ${brandClues.strength}.`
  ];

  if (operatorReferencesUsed) {
    sourceNotes.push("Operator notes or references were present and used only as directional context.");
  }

  const riskFlags = new Set<string>();
  if (selection.usedFallback) {
    riskFlags.add("preset-selection-ambiguous");
  }
  if (brandClues.strength === "weak") {
    riskFlags.add("low-brand-confidence");
  }
  if (hasDirectionConflict) {
    riskFlags.add("direction-conflict-with-site-reality");
  }
  if (decision.preserveExternalFlow) {
    riskFlags.add("external-flow-preserved");
  }
  if (qualification.scores.contentSufficiency <= 5) {
    riskFlags.add("content-gap-present");
  }
  if (decision.requiresHumanApproval || selection.approvalSuggested || seedConfidence === "low") {
    riskFlags.add("approval-required");
  }

  const assumptions = collectAssumptions(snapshotResult, qualification, decision);
  const requiresHumanApproval =
    decision.requiresHumanApproval || selection.approvalSuggested || seedConfidence === "low" || hasDirectionConflict;

  return {
    seedId: createId("seed", decision.leadKey),
    leadKey: decision.leadKey,
    primaryPresetId: appliedPreset.id,
    seedConfidence,
    sourceSummary: {
      appliedLayers,
      brandCluesStrength: brandClues.strength,
      operatorReferencesUsed,
      notes: sourceNotes
    },
    tasteProfile: {
      designVariance: appliedPreset.taste.design_variance,
      motionIntensity: appliedPreset.taste.motion_intensity,
      visualDensity: appliedPreset.taste.visual_density
    },
    copyProfile: {
      tone: appliedPreset.copy.tone,
      ctaBias: appliedPreset.copy.cta_bias,
      trustEmphasis: appliedPreset.copy.trust_emphasis,
      headlineStyle: appliedPreset.copy.headline_style
    },
    layoutProfile: {
      requiredSections: mergeUnique(
        globalDefaults.layout.required_sections,
        appliedPreset.layout.required_sections,
        decision.preserveExternalFlow ? ["contact-booking"] : []
      ),
      optionalSections: mergeUnique(
        globalDefaults.layout.optional_sections,
        appliedPreset.layout.optional_sections,
        qualification.scores.contentSufficiency <= 5 ? ["faq"] : []
      ),
      orderingBias: mergeOrdering(globalDefaults.layout.ordering_bias, appliedPreset.layout.ordering_bias)
    },
    visualDirection: mergeDirection(
      globalDefaults.designSeed.visual_direction,
      appliedPreset.designSeed.visual_direction,
      brandClues.directionHints
    ),
    paletteDirection: mergeDirection(
      globalDefaults.designSeed.palette_direction,
      appliedPreset.designSeed.palette_direction,
      brandClues.paletteHints
    ),
    typographyDirection: mergeDirection(
      globalDefaults.designSeed.typography_direction,
      appliedPreset.designSeed.typography_direction,
      brandClues.typographyHints
    ),
    imageryDirection: mergeDirection(
      globalDefaults.designSeed.imagery_direction,
      appliedPreset.designSeed.imagery_direction,
      brandClues.imageryHints
    ),
    preservedConstraints: [
      "No fabricated content.",
      "No scope expansion beyond decision.",
      decision.preserveExternalFlow
        ? "Preserve external flow as the live booking or conversion endpoint."
        : "No fake internal booking or conversion flow.",
      "No fake CMS/CRM/app logic."
    ],
    editableScope: [...(decision.editableBlocks ?? [])] as EditableBlock[],
    riskFlags: Array.from(riskFlags),
    requiresHumanApproval,
    assumptions: assumptions.length > 0 ? assumptions : undefined
  };
}

function determineSeedConfidence(
  selection: PresetSelectionResult,
  qualification: QualificationArtifact,
  hasDirectionConflict: boolean
): DesignSeedConfidence {
  if (selection.usedFallback || selection.ambiguous || qualification.scores.confidence <= 4 || hasDirectionConflict) {
    return "low";
  }

  if (qualification.scores.confidence >= 7 && qualification.scores.buildFeasibility >= 6) {
    return "high";
  }

  if (qualification.scores.confidence >= 5) {
    return "medium";
  }

  return "low";
}

function inferBrandClues(snapshotResult: SnapshotExecutionResult): {
  strength: "weak" | "medium" | "strong";
  directionHints: string[];
  paletteHints: string[];
  typographyHints: string[];
  imageryHints: string[];
} {
  const homeAnalysis = snapshotResult.pageAnalyses[0];
  const titles = snapshotResult.pageAnalyses
    .map((analysis) => analysis.title.trim())
    .filter((title) => title.length > 0 && !/^(home|welcome)$/iu.test(title));
  const combinedText = snapshotResult.pageAnalyses.map((analysis) => analysis.textSample.toLowerCase()).join("\n");
  const gallerySignals = /(gallery|before|after|portfolio|works|галере|до|после)/iu.test(combinedText);
  const clinicalSignals = /(clinic|medical|doctor|implant|ortho|стериль|клиник)/iu.test(combinedText);
  const legalSignals = /(law|legal|attorney|юрист|адвокат|право)/iu.test(combinedText);

  let strength: "weak" | "medium" | "strong" = "weak";
  if (titles.length >= 2 || homeAnalysis?.textLength >= 1_000) {
    strength = "medium";
  }
  if (titles.length >= 2 && homeAnalysis?.textLength >= 2_000) {
    strength = "strong";
  }

  const directionHints: string[] = [];
  const paletteHints: string[] = [];
  const typographyHints: string[] = [];
  const imageryHints: string[] = [];

  if (gallerySignals) {
    directionHints.push("Use visual proof blocks where real gallery material exists.");
    imageryHints.push("Prefer real service imagery and gallery-derived crops over abstract decoration.");
  }
  if (clinicalSignals) {
    paletteHints.push("Lean toward restrained clinical clarity instead of lifestyle warmth.");
    typographyHints.push("Keep typography highly readable and trust-led.");
  }
  if (legalSignals) {
    directionHints.push("Prioritize structured trust framing and restrained authority cues.");
    typographyHints.push("Favor sober hierarchy over expressive display treatment.");
  }

  return {
    strength,
    directionHints,
    paletteHints,
    typographyHints,
    imageryHints
  };
}

function mergeUnique(...collections: string[][]): string[] {
  return Array.from(new Set(collections.flat()));
}

function mergeOrdering(globalOrdering: string[], presetOrdering: string[]): string[] {
  return Array.from(new Set([...presetOrdering, ...globalOrdering]));
}

function mergeDirection(globalDirection: string[], presetDirection: string[], siteHints: string[]): string[] {
  return Array.from(new Set([...presetDirection, ...globalDirection, ...siteHints]));
}

function collectAssumptions(
  snapshotResult: SnapshotExecutionResult,
  qualification: QualificationArtifact,
  decision: DecisionArtifact
): string[] {
  const assumptions = new Set<string>();
  const combinedText = snapshotResult.pageAnalyses.map((analysis) => analysis.textSample.toLowerCase()).join("\n");

  if (!/(price|pricing|prices|цены|прайс)/iu.test(combinedText)) {
    assumptions.add("Exact prices stay as placeholders until they are verified on the source site.");
  }
  if (!/(team|staff|doctor|attorney|stylist|команд|врач|адвокат|мастер)/iu.test(combinedText)) {
    assumptions.add("Staff details remain optional unless clearly verified on the current site.");
  }
  if (!/(review|testimonial|отзыв)/iu.test(combinedText)) {
    assumptions.add("Trust proof should avoid fabricated reviews and may rely on non-review credibility signals.");
  }
  if (qualification.scores.contentSufficiency <= 5) {
    assumptions.add("Some detailed service copy may need placeholders because current-site coverage is limited.");
  }
  if (decision.preserveExternalFlow) {
    assumptions.add("All booking or conversion CTA routes keep the existing external destination.");
  }

  return Array.from(assumptions);
}
