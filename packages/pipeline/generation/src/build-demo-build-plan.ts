import type {
  BuildStopReason,
  ContentSourceType,
  DecisionArtifact,
  DemoBuildPlanArtifact,
  DesignSeedArtifact,
  EditableBlock,
  PlaceholderGapType,
  QualificationArtifact,
  RedesignBriefArtifact,
  RunRequest
} from "../../../shared/src/contracts";
import { createId } from "../../../shared/src/ids";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";

export function buildDemoBuildPlan(params: {
  decision: DecisionArtifact;
  designSeed: DesignSeedArtifact;
  redesignBrief: RedesignBriefArtifact;
  qualification: QualificationArtifact;
  snapshotResult: SnapshotExecutionResult;
  request: RunRequest;
  designSeedRef: string;
  redesignBriefRef: string;
}): DemoBuildPlanArtifact {
  const { decision, designSeed, redesignBrief, qualification, snapshotResult, request, designSeedRef, redesignBriefRef } =
    params;

  if (decision.finalDecision !== "DEMO_FRONT_ONLY" && decision.finalDecision !== "DEMO_EDITABLE_CONTENT") {
    throw new Error(`Cannot build demo build plan for non-buildable decision ${decision.finalDecision}.`);
  }

  const stopReasons = collectStopReasons(decision, designSeed, redesignBrief, qualification, snapshotResult);
  const generationReady = stopReasons.length === 0;
  const editableScope = decision.finalDecision === "DEMO_EDITABLE_CONTENT" ? [...(decision.editableBlocks ?? [])] : [];
  const combinedText = getCombinedText(snapshotResult).toLowerCase();

  return {
    buildPlanId: createId("build-plan", decision.leadKey),
    leadKey: decision.leadKey,
    decisionType: decision.finalDecision,
    generationMode: decision.finalDecision === "DEMO_EDITABLE_CONTENT" ? "limited-editable-content" : "front-only",
    designSeedRef,
    redesignBriefRef,
    pagePlan: {
      planType: redesignBrief.pagePlanSummary.planType,
      pages: redesignBrief.pagePlanSummary.plannedPages.map((page) => ({
        pageKey: page.pageKey,
        pageType: page.pageType,
        sourceBasis: buildSourceBasis(page.pageKey, page.pageType, qualification, snapshotResult),
        required: page.required
      })),
      rationale: redesignBrief.pagePlanSummary.rationale
    },
    sectionPlan: redesignBrief.sectionPlan.map((section) => ({
      pageKey: section.scopeRef,
      sections: section.sections,
      editableBlocks:
        decision.finalDecision === "DEMO_EDITABLE_CONTENT"
          ? mapEditableBlocks(section.scopeRef, section.sections, editableScope)
          : undefined,
      notes: section.notes
    })),
    contentSources: buildContentSources(redesignBrief, qualification, request, combinedText),
    editableScope,
    externalFlowHandling: redesignBrief.externalFlowHandling,
    placeholders: buildPlaceholders(redesignBrief, combinedText),
    approvalRequired: redesignBrief.approvalRequired,
    generationReady,
    stopReasons,
    assumptions: redesignBrief.assumptions
  };
}

function collectStopReasons(
  decision: DecisionArtifact,
  designSeed: DesignSeedArtifact,
  redesignBrief: RedesignBriefArtifact,
  qualification: QualificationArtifact,
  snapshotResult: SnapshotExecutionResult
): BuildStopReason[] {
  const reasons = new Set<BuildStopReason>();

  if (decision.finalDecision !== "DEMO_FRONT_ONLY" && decision.finalDecision !== "DEMO_EDITABLE_CONTENT") {
    reasons.add("MISSING_GENERATION_ELIGIBILITY");
  }

  if (!designSeed || !redesignBrief || !qualification || !snapshotResult) {
    reasons.add("MISSING_REQUIRED_INPUT");
  }

  const decisionEditableBlocks = new Set(decision.editableBlocks ?? []);
  if (redesignBrief.editableScope.some((block) => !decisionEditableBlocks.has(block))) {
    reasons.add("EDITABLE_SCOPE_EXCEEDED");
  }

  if (decision.preserveExternalFlow && redesignBrief.externalFlowHandling.mode === "preserved-integration-point") {
    reasons.add("EXTERNAL_FLOW_AMBIGUOUS");
  }

  if (
    redesignBrief.pagePlanSummary.plannedPages.length === 0 ||
    redesignBrief.pagePlanSummary.plannedPages.length > 4
  ) {
    reasons.add("PAGE_SCOPE_NOT_DEFENSIBLE");
  }

  if (qualification.scores.contentSufficiency <= 3) {
    reasons.add("CONTENT_GAP_MATERIAL");
  }

  if (designSeed.seedConfidence === "low") {
    reasons.add("LOW_SEED_CONFIDENCE");
  }

  if (designSeed.riskFlags.includes("direction-conflict-with-site-reality")) {
    reasons.add("DIRECTION_CONFLICT_WITH_SITE_REALITY");
  }

  if (qualification.scores.complexity >= 7 || qualification.scores.confidence <= 5) {
    reasons.add("COMPLEXITY_BORDERLINE");
  }

  return Array.from(reasons);
}

function buildSourceBasis(
  pageKey: string,
  pageType: RedesignBriefArtifact["pagePlanSummary"]["plannedPages"][number]["pageType"],
  qualification: QualificationArtifact,
  snapshotResult: SnapshotExecutionResult
): string {
  if (pageType === "home") {
    return qualification.evidence?.homepageFinding ?? "Homepage was directly captured and remains the main demo surface.";
  }

  if (pageType === "key-service") {
    return qualification.evidence?.serviceCoverage ?? "A defensible service-oriented page was captured and supports the limited demo scope.";
  }

  if (pageType === "contact-booking") {
    return qualification.evidence?.externalFlowNotes ?? "Contact or booking handling is needed to keep the conversion path explicit.";
  }

  return snapshotResult.artifact.selectionMode === "ONE_PAGE_VIRTUAL_SECTIONS"
    ? "One-page site is better represented through sections than artificial pagination."
    : `Page ${pageKey} is included only because it fits the conservative approved scope.`;
}

function mapEditableBlocks(scopeRef: string, sections: string[], editableScope: EditableBlock[]): EditableBlock[] {
  const allowed = new Set(editableScope);
  const mapped = new Set<EditableBlock>();

  for (const section of sections) {
    const normalized = section.toLowerCase();
    if ((normalized.includes("hero") || normalized.includes("intro")) && allowed.has("hero")) {
      mapped.add("hero");
    }
    if (normalized.includes("service") && allowed.has("services")) {
      mapped.add("services");
    }
    if ((normalized.includes("price") || normalized.includes("pricing")) && allowed.has("prices")) {
      mapped.add("prices");
    }
    if ((normalized.includes("team") || normalized.includes("staff")) && allowed.has("team")) {
      mapped.add("team");
    }
    if ((normalized.includes("review") || normalized.includes("proof")) && allowed.has("reviews")) {
      mapped.add("reviews");
    }
    if ((normalized.includes("contact") || normalized.includes("booking")) && allowed.has("contacts")) {
      mapped.add("contacts");
    }
    if (normalized.includes("faq") && allowed.has("faq")) {
      mapped.add("faq");
    }
    if ((normalized.includes("gallery") || normalized.includes("visual")) && allowed.has("gallery")) {
      mapped.add("gallery");
    }
    if (normalized.includes("cta") && allowed.has("cta")) {
      mapped.add("cta");
    }
  }

  if (scopeRef === "home" && allowed.has("hero")) {
    mapped.add("hero");
  }

  return Array.from(mapped);
}

function buildContentSources(
  redesignBrief: RedesignBriefArtifact,
  qualification: QualificationArtifact,
  request: RunRequest,
  combinedText: string
): DemoBuildPlanArtifact["contentSources"] {
  const sources: DemoBuildPlanArtifact["contentSources"] = [
    {
      scopeRef: "home.hero",
      sourceType: "verified-current-site",
      notes: qualification.evidence?.homepageFinding ?? "Use only verified homepage offer and CTA wording as baseline."
    },
    {
      scopeRef: "page-scope",
      sourceType: "qualification-finding",
      notes: qualification.evidence?.serviceCoverage ?? "Qualification findings define the defensible page scope."
    },
    {
      scopeRef: "global-direction",
      sourceType: "preset-direction",
      notes: redesignBrief.visualDirection.join(" ")
    }
  ];

  if (request.operatorNotes || request.operatorReferences?.length) {
    sources.push({
      scopeRef: "operator-context",
      sourceType: "operator-approved-note",
      notes: request.operatorNotes ?? "Operator references may inform direction only when already present in the request."
    });
  }

  if (!/(price|pricing|prices|staff|team|review|testimonial|caption|gallery|license|certified|лиценз|сертифик)/iu.test(combinedText)) {
    sources.push({
      scopeRef: "content-gaps",
      sourceType: "placeholder-assumption",
      notes: "Unsupported detail stays as placeholders or assumptions instead of being fabricated."
    });
  }

  return sources;
}

function buildPlaceholders(
  redesignBrief: RedesignBriefArtifact,
  combinedText: string
): DemoBuildPlanArtifact["placeholders"] {
  const placeholders: DemoBuildPlanArtifact["placeholders"] = [];
  const placeholderEntries: Array<{ scopeRef: string; gapType: PlaceholderGapType; pattern: RegExp; notes: string }> = [
    {
      scopeRef: "prices",
      gapType: "price-gap",
      pattern: /(price|pricing|prices|цены|прайс)/iu,
      notes: "Exact price details should remain placeholders until verified on the source site."
    },
    {
      scopeRef: "team",
      gapType: "staff-gap",
      pattern: /(team|staff|doctor|attorney|stylist|команд|врач|адвокат|мастер)/iu,
      notes: "Staff identities should not be invented when the source site does not provide them clearly."
    },
    {
      scopeRef: "reviews",
      gapType: "social-proof-gap",
      pattern: /(review|testimonial|отзыв)/iu,
      notes: "Avoid fabricated reviews; use alternative trust framing if review evidence is missing."
    },
    {
      scopeRef: "gallery",
      gapType: "image-gap",
      pattern: /(gallery|portfolio|before|after|галере|портфолио|до|после)/iu,
      notes: "Image captions or gallery detail remain optional if the source site does not support them."
    },
    {
      scopeRef: "regulatory",
      gapType: "regulatory-gap",
      pattern: /(license|licensed|certified|сертифик|лиценз)/iu,
      notes: "Regulatory or license statements require verified source material."
    },
    {
      scopeRef: "service-copy",
      gapType: "service-detail-gap",
      pattern: /(service|services|treatment|care|услуг|процедур|service intro)/iu,
      notes: "Detailed service copy may need placeholders if current-site evidence is too thin."
    }
  ];

  for (const entry of placeholderEntries) {
    if (!entry.pattern.test(combinedText)) {
      placeholders.push({
        scopeRef: entry.scopeRef,
        gapType: entry.gapType,
        notes: entry.notes,
        approvalRequired: redesignBrief.approvalRequired
      });
    }
  }

  return placeholders.length > 0 ? placeholders : undefined;
}

function getCombinedText(snapshotResult: SnapshotExecutionResult): string {
  return snapshotResult.pageAnalyses
    .flatMap((analysis) => [analysis.title, analysis.textSample, analysis.finalUrl])
    .join("\n");
}
