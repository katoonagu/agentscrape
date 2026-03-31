import type {
  ApprovalTrigger,
  LeadArtifact,
  QualificationArtifact,
  ReasonCode,
  ScoreSet
} from "../../../shared/src/contracts";
import { createId, nowIso } from "../../../shared/src/ids";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";
import { detectBorderlineLowConfidence, detectConflictingScores, decideLead } from "../../decision/src/decide-lead";

export function qualifyLead(params: {
  lead: LeadArtifact;
  snapshotResult: SnapshotExecutionResult;
  snapshotRef: string;
}): QualificationArtifact {
  const { lead, snapshotResult, snapshotRef } = params;
  const scores = scoreLead(snapshotResult);
  const fallbackDecision = decideLead({
    lead,
    snapshotResult,
    qualification: undefined
  });
  const reasonCodes = deriveReasonCodes(scores, snapshotResult);
  const approvalTriggers = deriveApprovalTriggers(scores, snapshotResult, fallbackDecision.finalDecision);

  return {
    qualificationId: createId("qualification", lead.leadId),
    leadKey: lead.leadKey,
    snapshotRef,
    qualifiedAt: nowIso(),
    selectionMode: snapshotResult.artifact.selectionMode,
    inspectedSlots: snapshotResult.artifact.entries.map((entry) => entry.slot),
    evidence: {
      homepageFinding:
        snapshotResult.pageAnalyses[0]?.title ||
        snapshotResult.pageAnalyses[0]?.textSample.slice(0, 120) ||
        "Homepage inspection did not yield readable content.",
      serviceCoverage: summarizeServiceCoverage(snapshotResult),
      contentNotes: `Captured ${snapshotResult.pageAnalyses.length} view(s); total visible text length ${sumTextLength(snapshotResult)}.`,
      externalFlowNotes:
        snapshotResult.artifact.externalFlow === "EXTERNAL_BOOKING_OR_WIDGET"
          ? "External booking/widget flow detected and must be preserved."
          : "No external booking/widget flow detected."
    },
    blocking: {
      encountered: snapshotResult.barrierEncountered,
      barrierType: snapshotResult.artifact.accessBarrier,
      retryAttempted: snapshotResult.retryAttempted,
      retrySucceeded: snapshotResult.retrySucceeded
    },
    scores,
    recommendedDecision: fallbackDecision.finalDecision,
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : undefined,
    requiresHumanApproval: approvalTriggers.length > 0,
    humanApprovalTriggers: approvalTriggers.length > 0 ? approvalTriggers : undefined,
    notes: snapshotResult.technicalNotes.join(" | ") || undefined
  };
}

function scoreLead(snapshotResult: SnapshotExecutionResult): ScoreSet {
  const totalTextLength = sumTextLength(snapshotResult);
  const pageCount = snapshotResult.pageAnalyses.length;
  const servicePageCount = snapshotResult.pageAnalyses.filter((analysis) => analysis.hasServiceSignals).length;
  const hasContact = snapshotResult.pageAnalyses.some((analysis) => analysis.hasContact);
  const hasCta = snapshotResult.pageAnalyses.some((analysis) => analysis.hasCta);
  const hasPricing = snapshotResult.pageAnalyses.some((analysis) => analysis.hasPricingSignals);
  const externalFlow = snapshotResult.artifact.externalFlow === "EXTERNAL_BOOKING_OR_WIDGET";
  const appHintScore = snapshotResult.pageAnalyses.reduce((sum, analysis) => sum + analysis.appHintCount, 0);

  let contentSufficiency = 2;
  if (totalTextLength >= 3_500) {
    contentSufficiency = 8;
  } else if (totalTextLength >= 2_500) {
    contentSufficiency = 7;
  } else if (totalTextLength >= 1_500) {
    contentSufficiency = 6;
  } else if (totalTextLength >= 800) {
    contentSufficiency = 5;
  } else if (totalTextLength >= 400) {
    contentSufficiency = 4;
  } else if (totalTextLength >= 150) {
    contentSufficiency = 3;
  }
  if (servicePageCount >= 1) {
    contentSufficiency += 1;
  }
  if (hasContact) {
    contentSufficiency += 1;
  }

  let buildFeasibility = 5;
  if (pageCount >= 2) {
    buildFeasibility += 1;
  }
  if (servicePageCount >= 1) {
    buildFeasibility += 1;
  }
  if (hasContact || hasCta) {
    buildFeasibility += 1;
  }
  if (contentSufficiency <= 3) {
    buildFeasibility -= 1;
  }
  if (externalFlow) {
    buildFeasibility -= 1;
  }
  if (snapshotResult.barrierEncountered && !snapshotResult.retrySucceeded) {
    buildFeasibility -= 3;
  }
  if (appHintScore >= 4) {
    buildFeasibility -= 3;
  }

  let complexity = 3;
  if (appHintScore >= 5) {
    complexity = 8;
  } else if (externalFlow) {
    complexity = 7;
  } else if (pageCount >= 3 || servicePageCount >= 2) {
    complexity = 5;
  } else if (pageCount >= 2 || servicePageCount >= 1 || hasPricing) {
    complexity = 4;
  }

  let confidence = 3;
  confidence += Math.min(pageCount, 3);
  if (!snapshotResult.barrierEncountered || snapshotResult.retrySucceeded) {
    confidence += 2;
  }
  if (servicePageCount >= 1 || snapshotResult.artifact.selectionMode === "ONE_PAGE_VIRTUAL_SECTIONS") {
    confidence += 1;
  }
  if (totalTextLength >= 800) {
    confidence += 1;
  }
  if (snapshotResult.barrierEncountered && !snapshotResult.retrySucceeded) {
    confidence -= 2;
  }
  if (appHintScore >= 4) {
    confidence -= 1;
  }

  let redesignValue = 4;
  if (!hasCta) {
    redesignValue += 2;
  }
  if (!hasContact) {
    redesignValue += 1;
  }
  if (servicePageCount === 0 && snapshotResult.artifact.selectionMode !== "ONE_PAGE_VIRTUAL_SECTIONS") {
    redesignValue += 1;
  }
  if (contentSufficiency >= 6 && buildFeasibility >= 5) {
    redesignValue += 1;
  }
  if (appHintScore >= 5 && buildFeasibility <= 4) {
    redesignValue -= 1;
  }

  return {
    redesignValue: clamp(redesignValue),
    buildFeasibility: clamp(buildFeasibility),
    contentSufficiency: clamp(contentSufficiency),
    complexity: clamp(complexity),
    confidence: clamp(confidence)
  };
}

function deriveReasonCodes(snapshotScores: ScoreSet, snapshotResult: SnapshotExecutionResult): ReasonCode[] {
  const reasonCodes = new Set<ReasonCode>();

  if (snapshotScores.redesignValue <= 3) {
    reasonCodes.add("LOW_UPLIFT");
  }
  if (snapshotScores.buildFeasibility <= 3) {
    reasonCodes.add("LOW_FEASIBILITY");
  }
  if (snapshotScores.complexity >= 8) {
    reasonCodes.add("TOO_COMPLEX");
  }
  if (snapshotScores.confidence <= 4) {
    reasonCodes.add("LOW_CONFIDENCE");
  }
  if (snapshotResult.barrierEncountered && snapshotResult.retryAttempted && !snapshotResult.retrySucceeded) {
    reasonCodes.add("BLOCKED_BY_ANTI_BOT");
  }
  if (snapshotResult.artifact.externalFlow === "EXTERNAL_BOOKING_OR_WIDGET") {
    reasonCodes.add("EXTERNAL_FLOW_PRESERVED");
  }
  if (snapshotScores.contentSufficiency >= 6) {
    reasonCodes.add("ENOUGH_CONTENT_FOR_EDITABLE_DEMO");
  }

  return Array.from(reasonCodes);
}

function deriveApprovalTriggers(
  scores: ScoreSet,
  snapshotResult: SnapshotExecutionResult,
  candidateDecision: "SKIP" | "AUDIT_ONLY" | "DEMO_FRONT_ONLY" | "DEMO_EDITABLE_CONTENT"
): ApprovalTrigger[] {
  const triggers = new Set<ApprovalTrigger>();

  if (snapshotResult.artifact.externalFlow === "EXTERNAL_BOOKING_OR_WIDGET") {
    triggers.add("EXTERNAL_FLOW_CASE");
  }

  if (detectConflictingScores(scores, snapshotResult.artifact.externalFlow)) {
    triggers.add("CONFLICTING_SCORES");
  }

  if (detectBorderlineLowConfidence(candidateDecision, scores)) {
    triggers.add("LOW_CONFIDENCE_BORDERLINE");
  }

  return Array.from(triggers);
}

function summarizeServiceCoverage(snapshotResult: SnapshotExecutionResult): string {
  const servicePages = snapshotResult.pageAnalyses.filter((analysis) => analysis.hasServiceSignals);
  if (servicePages.length === 0 && snapshotResult.artifact.selectionMode === "ONE_PAGE_VIRTUAL_SECTIONS") {
    return "One-page fallback used; service section inferred from homepage structure.";
  }

  if (servicePages.length === 0) {
    return "No clear service pages were defensibly captured.";
  }

  return `Captured ${servicePages.length} service-like view(s): ${servicePages.map((analysis) => analysis.finalUrl).join(", ")}`;
}

function sumTextLength(snapshotResult: SnapshotExecutionResult): number {
  return snapshotResult.pageAnalyses.reduce((sum, analysis) => sum + analysis.textLength, 0);
}

function clamp(value: number): number {
  return Math.max(1, Math.min(10, value));
}
