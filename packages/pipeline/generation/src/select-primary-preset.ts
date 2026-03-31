import type { LeadArtifact, NichePreset, QualificationArtifact } from "../../../shared/src/contracts";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";

const EXPLICIT_SIGNAL_MAP: Record<string, string[]> = {
  "beauty-salon": ["salon", "beauty", "hair", "nails", "brow", "lashes", "spa"],
  "dental-clinic": ["dental", "dentist", "clinic", "ortho", "implant", "whitening"],
  "legal-services": ["law", "legal", "attorney", "юрист", "адвокат", "право"]
};

export interface PresetScoreBreakdown {
  presetId: string;
  score: number;
  matchedPositiveSignals: string[];
  matchedOfferSignals: string[];
  matchedNegativeSignals: string[];
}

export interface PresetSelectionResult {
  primaryPreset: NichePreset;
  primaryPresetId: string;
  usedFallback: boolean;
  ambiguous: boolean;
  approvalSuggested: boolean;
  scoreBreakdown: PresetScoreBreakdown[];
  notes: string[];
}

export function selectPrimaryPreset(params: {
  lead: LeadArtifact;
  qualification: QualificationArtifact;
  snapshotResult: SnapshotExecutionResult;
  presets: NichePreset[];
}): PresetSelectionResult {
  const { lead, qualification, snapshotResult, presets } = params;
  const evidenceCorpus = buildEvidenceCorpus(lead, qualification, snapshotResult);
  const activePresets = presets.filter((preset) => preset.status === "active");
  const globalDefaults = activePresets.find((preset) => preset.id === "global-defaults");
  if (!globalDefaults) {
    throw new Error("Active preset set does not contain global-defaults.");
  }

  const nichePresets = activePresets.filter((preset) => preset.id !== "global-defaults");
  const scoreBreakdown = nichePresets
    .map((preset) => scorePreset(preset, evidenceCorpus))
    .sort((left, right) => right.score - left.score);

  const topCandidate = scoreBreakdown[0];
  const runnerUp = scoreBreakdown[1];
  const clearWinner =
    topCandidate && topCandidate.score >= 4 && (!runnerUp || topCandidate.score - runnerUp.score >= 2);

  if (!clearWinner || !topCandidate) {
    const notes = ["No niche preset reached a defensible deterministic threshold; fallback to global-defaults."];
    if (topCandidate) {
      notes.push(`Best niche score ${topCandidate.presetId}=${topCandidate.score}.`);
    }

    return {
      primaryPreset: globalDefaults,
      primaryPresetId: globalDefaults.id,
      usedFallback: true,
      ambiguous: Boolean(topCandidate && runnerUp && topCandidate.score - runnerUp.score < 2),
      approvalSuggested: true,
      scoreBreakdown,
      notes
    };
  }

  const winner = nichePresets.find((preset) => preset.id === topCandidate.presetId);
  if (!winner) {
    throw new Error(`Resolved preset ${topCandidate.presetId} is missing from active preset list.`);
  }

  return {
    primaryPreset: winner,
    primaryPresetId: winner.id,
    usedFallback: false,
    ambiguous: Boolean(runnerUp && topCandidate.score - runnerUp.score < 3),
    approvalSuggested: Boolean(runnerUp && topCandidate.score - runnerUp.score < 3),
    scoreBreakdown,
    notes: [`Selected preset ${winner.id} with score ${topCandidate.score}.`]
  };
}

function buildEvidenceCorpus(
  lead: LeadArtifact,
  qualification: QualificationArtifact,
  snapshotResult: SnapshotExecutionResult
): string {
  const evidenceParts = [
    lead.businessName,
    lead.siteUrl,
    qualification.evidence?.homepageFinding,
    qualification.evidence?.serviceCoverage,
    qualification.evidence?.contentNotes,
    qualification.evidence?.externalFlowNotes,
    qualification.notes,
    ...snapshotResult.pageAnalyses.flatMap((analysis) => [
      analysis.title,
      analysis.finalUrl,
      analysis.requestedUrl,
      analysis.textSample
    ])
  ];

  return evidenceParts
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .toLowerCase();
}

function scorePreset(preset: NichePreset, evidenceCorpus: string): PresetScoreBreakdown {
  const matchedPositiveSignals = collectMatches(
    [...preset.applicability.positive_signals, ...(EXPLICIT_SIGNAL_MAP[preset.id] ?? [])],
    evidenceCorpus
  );
  const matchedOfferSignals = collectMatches(
    [...preset.applicability.typical_offers, ...preset.applicability.site_clues],
    evidenceCorpus
  );
  const matchedNegativeSignals = collectMatches(preset.applicability.negative_signals, evidenceCorpus);

  return {
    presetId: preset.id,
    score: matchedPositiveSignals.length * 3 + matchedOfferSignals.length * 2 - matchedNegativeSignals.length * 4,
    matchedPositiveSignals,
    matchedOfferSignals,
    matchedNegativeSignals
  };
}

function collectMatches(candidates: string[], evidenceCorpus: string): string[] {
  const normalizedCandidates = candidates
    .map((candidate) => candidate.trim().toLowerCase())
    .filter((candidate) => candidate.length > 0);

  return Array.from(
    new Set(
      normalizedCandidates.filter((candidate) => {
        if (candidate.length < 3) {
          return false;
        }

        return evidenceCorpus.includes(candidate);
      })
    )
  );
}
