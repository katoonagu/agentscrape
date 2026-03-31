import type {
  AccessBarrier,
  ApprovalTrigger,
  DecisionArtifact,
  EditableBlock,
  ExternalFlow,
  LeadArtifact,
  PipelineDecision,
  QualificationArtifact,
  ReasonCode,
  ScoreSet
} from "../../../shared/src/contracts";
import { createId, nowIso } from "../../../shared/src/ids";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";

interface DecisionContext {
  lead: LeadArtifact;
  scores: ScoreSet;
  barrierType: AccessBarrier;
  retryAttempted: boolean;
  retrySucceeded: boolean;
  externalFlow: ExternalFlow;
  editableBlockCandidates: EditableBlock[];
  hasServiceCoverage: boolean;
}

export function decideLead(params: {
  lead: LeadArtifact;
  qualification?: QualificationArtifact;
  snapshotResult?: SnapshotExecutionResult;
}): DecisionArtifact {
  const { lead, qualification, snapshotResult } = params;

  if (!lead.hasSite) {
    return createSkipDecision(lead, "NO_SITE", {
      redesignValue: 1,
      buildFeasibility: 1,
      contentSufficiency: 1,
      complexity: 1,
      confidence: 9
    });
  }

  if (lead.duplicateOfLeadKey) {
    return createSkipDecision(lead, "DUPLICATE_DOMAIN", {
      redesignValue: 1,
      buildFeasibility: 1,
      contentSufficiency: 1,
      complexity: 1,
      confidence: 9
    });
  }

  const scores = qualification?.scores ?? {
    redesignValue: 4,
    buildFeasibility: 2,
    contentSufficiency: 2,
    complexity: 6,
    confidence: 3
  };
  const barrierType = qualification?.blocking.barrierType ?? "CHALLENGE";
  const retryAttempted = qualification?.blocking.retryAttempted ?? Boolean(snapshotResult?.retryAttempted);
  const retrySucceeded = qualification?.blocking.retrySucceeded ?? Boolean(snapshotResult?.retrySucceeded);
  const externalFlow = snapshotResult?.artifact.externalFlow ?? "NONE";
  const editableBlockCandidates = buildEditableBlockCandidates(snapshotResult);
  const hasServiceCoverage = Boolean(snapshotResult?.pageAnalyses.some((analysis) => analysis.hasServiceSignals));

  return evaluateDecision({
    lead,
    scores,
    barrierType,
    retryAttempted,
    retrySucceeded,
    externalFlow,
    editableBlockCandidates,
    hasServiceCoverage
  });
}

export function detectConflictingScores(scores: ScoreSet, externalFlow: ExternalFlow): boolean {
  return (
    (scores.redesignValue >= 6 && scores.buildFeasibility <= 4) ||
    (scores.contentSufficiency >= 6 && scores.complexity >= 7) ||
    (externalFlow === "EXTERNAL_BOOKING_OR_WIDGET" &&
      scores.redesignValue >= 6 &&
      scores.buildFeasibility >= 6 &&
      scores.contentSufficiency >= 6)
  );
}

export function detectBorderlineLowConfidence(decision: PipelineDecision, scores: ScoreSet): boolean {
  if (scores.confidence > 6) {
    return false;
  }

  if (decision === "DEMO_EDITABLE_CONTENT") {
    return (
      Math.abs(scores.redesignValue - 6) <= 1 ||
      Math.abs(scores.buildFeasibility - 6) <= 1 ||
      Math.abs(scores.contentSufficiency - 6) <= 1 ||
      Math.abs(scores.complexity - 6) <= 1 ||
      Math.abs(scores.confidence - 6) <= 1
    );
  }

  if (decision === "DEMO_FRONT_ONLY") {
    return (
      Math.abs(scores.redesignValue - 6) <= 1 ||
      Math.abs(scores.buildFeasibility - 5) <= 1 ||
      Math.abs(scores.complexity - 7) <= 1 ||
      Math.abs(scores.confidence - 6) <= 1
    );
  }

  return false;
}

export function buildEditableBlockCandidates(snapshotResult?: SnapshotExecutionResult): EditableBlock[] {
  if (!snapshotResult) {
    return [];
  }

  const blocks = new Set<EditableBlock>();
  blocks.add("hero");
  blocks.add("cta");

  if (snapshotResult.pageAnalyses.some((analysis) => analysis.hasServiceSignals)) {
    blocks.add("services");
  }

  if (snapshotResult.pageAnalyses.some((analysis) => analysis.hasPricingSignals)) {
    blocks.add("prices");
  }

  if (snapshotResult.pageAnalyses.some((analysis) => analysis.hasContact)) {
    blocks.add("contacts");
  }

  const combinedText = snapshotResult.pageAnalyses.map((analysis) => analysis.textSample.toLowerCase()).join("\n");
  if (/(review|testimonial|отзыв)/iu.test(combinedText)) {
    blocks.add("reviews");
  }

  if (/(faq|frequently asked|вопрос)/iu.test(combinedText)) {
    blocks.add("faq");
  }

  return Array.from(blocks);
}

function evaluateDecision(context: DecisionContext): DecisionArtifact {
  const {
    lead,
    scores,
    barrierType,
    retryAttempted,
    retrySucceeded,
    externalFlow,
    editableBlockCandidates,
    hasServiceCoverage
  } = context;
  const reasonCodes = new Set<ReasonCode>();

  if (scores.redesignValue <= 3) {
    reasonCodes.add("LOW_UPLIFT");
    return createDecision(lead, "SKIP", scores, Array.from(reasonCodes), false);
  }

  if (barrierType !== "NONE" && retryAttempted && !retrySucceeded) {
    reasonCodes.add("BLOCKED_BY_ANTI_BOT");
    return createDecision(
      lead,
      "AUDIT_ONLY",
      scores,
      Array.from(reasonCodes),
      false,
      undefined,
      undefined,
      "Persistent access barrier after one retry. Conservative downgrade to audit-only."
    );
  }

  if (scores.buildFeasibility <= 3) {
    reasonCodes.add("LOW_FEASIBILITY");
    return createDecision(lead, "SKIP", scores, Array.from(reasonCodes), false);
  }

  if (scores.complexity >= 8) {
    reasonCodes.add("TOO_COMPLEX");
    return createDecision(lead, "AUDIT_ONLY", scores, Array.from(reasonCodes), false);
  }

  if (scores.confidence <= 4) {
    reasonCodes.add("LOW_CONFIDENCE");
    return createDecision(lead, "AUDIT_ONLY", scores, Array.from(reasonCodes), false);
  }

  const editableEligible =
    externalFlow === "NONE" &&
    scores.redesignValue >= 6 &&
    scores.buildFeasibility >= 6 &&
    scores.contentSufficiency >= 6 &&
    scores.complexity <= 6 &&
    scores.confidence >= 6 &&
    editableBlockCandidates.length > 0;

  const frontOnlyEligible =
    scores.redesignValue >= 6 &&
    scores.buildFeasibility >= 5 &&
    scores.complexity <= 7 &&
    scores.confidence >= 6 &&
    (externalFlow === "EXTERNAL_BOOKING_OR_WIDGET" || scores.contentSufficiency < 6 || hasServiceCoverage);

  let candidateDecision: PipelineDecision = "AUDIT_ONLY";
  if (editableEligible) {
    candidateDecision = "DEMO_EDITABLE_CONTENT";
  } else if (frontOnlyEligible) {
    candidateDecision = "DEMO_FRONT_ONLY";
  }

  const conflicting = detectConflictingScores(scores, externalFlow);
  if (conflicting) {
    reasonCodes.add("LOW_CONFIDENCE");
    return createDecision(
      lead,
      "AUDIT_ONLY",
      scores,
      Array.from(reasonCodes),
      false,
      undefined,
      undefined,
      "Conflicting score pattern; buildable path is not defensible without human review."
    );
  }

  if (detectBorderlineLowConfidence(candidateDecision, scores)) {
    reasonCodes.add("LOW_CONFIDENCE");
    return createDecision(
      lead,
      "AUDIT_ONLY",
      scores,
      Array.from(reasonCodes),
      false,
      undefined,
      undefined,
      "Borderline low-confidence case; conservative downgrade to audit-only."
    );
  }

  if (candidateDecision === "DEMO_EDITABLE_CONTENT") {
    reasonCodes.add("ENOUGH_CONTENT_FOR_EDITABLE_DEMO");
    return createDecision(
      lead,
      "DEMO_EDITABLE_CONTENT",
      scores,
      Array.from(reasonCodes),
      false,
      undefined,
      editableBlockCandidates,
      "Conservative editable scope limited to evidence-backed brochure content blocks."
    );
  }

  if (candidateDecision === "DEMO_FRONT_ONLY") {
    const requiresHumanApproval = externalFlow === "EXTERNAL_BOOKING_OR_WIDGET";
    if (requiresHumanApproval) {
      reasonCodes.add("EXTERNAL_FLOW_PRESERVED");
      return createDecision(
        lead,
        "DEMO_FRONT_ONLY",
        scores,
        Array.from(reasonCodes),
        true,
        ["EXTERNAL_FLOW_CASE"],
        undefined,
        "Front-only redesign path with preserved external booking/widget flow.",
        true
      );
    }

    return createDecision(
      lead,
      "DEMO_FRONT_ONLY",
      scores,
      Array.from(reasonCodes),
      false,
      undefined,
      undefined,
      "Brochure-like site with a conservative front-only demo path."
    );
  }

  if (scores.buildFeasibility <= 4) {
    reasonCodes.add("LOW_FEASIBILITY");
  }

  return createDecision(
    lead,
    "AUDIT_ONLY",
    scores,
    Array.from(reasonCodes),
    false,
    undefined,
    undefined,
    "Defaulted to audit-only because no safe buildable branch was defensible."
  );
}

function createSkipDecision(lead: LeadArtifact, reasonCode: ReasonCode, scores: ScoreSet): DecisionArtifact {
  return createDecision(lead, "SKIP", scores, [reasonCode], false);
}

function createDecision(
  lead: LeadArtifact,
  finalDecision: PipelineDecision,
  scores: ScoreSet,
  reasonCodes: ReasonCode[],
  requiresHumanApproval: boolean,
  humanApprovalTriggers?: ApprovalTrigger[],
  editableBlocks?: EditableBlock[],
  demoScopeNote?: string,
  preserveExternalFlow?: boolean
): DecisionArtifact {
  return {
    decisionId: createId("decision", lead.leadId),
    leadKey: lead.leadKey,
    decidedAt: nowIso(),
    finalDecision,
    reasonCodes,
    scores,
    requiresHumanApproval,
    humanApprovalTriggers: requiresHumanApproval ? humanApprovalTriggers ?? [] : undefined,
    approvalStatus: requiresHumanApproval ? "pending" : "not-required",
    preserveExternalFlow,
    editableBlocks,
    demoScopeNote
  };
}
