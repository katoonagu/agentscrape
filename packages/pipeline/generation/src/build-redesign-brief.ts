import type {
  DecisionArtifact,
  DesignSeedArtifact,
  RedesignBriefArtifact,
  QualificationArtifact
} from "../../../shared/src/contracts";
import { createId } from "../../../shared/src/ids";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";

export function buildRedesignBrief(params: {
  decision: DecisionArtifact;
  qualification: QualificationArtifact;
  snapshotResult: SnapshotExecutionResult;
  designSeed: DesignSeedArtifact;
  designSeedRef: string;
}): RedesignBriefArtifact {
  const { decision, qualification, snapshotResult, designSeed, designSeedRef } = params;
  if (decision.finalDecision !== "DEMO_FRONT_ONLY" && decision.finalDecision !== "DEMO_EDITABLE_CONTENT") {
    throw new Error(`Cannot build redesign brief for non-buildable decision ${decision.finalDecision}.`);
  }

  const externalFlowHandling = mapExternalFlowHandling(decision, snapshotResult);
  const pagePlanSummary = buildPagePlanSummary(decision, snapshotResult, externalFlowHandling.mode !== "not-applicable");
  const sectionPlan = buildSectionPlan(pagePlanSummary.plannedPages);
  const nonGoals = [
    "No internal booking engine.",
    "No CMS/CRM/app logic.",
    "No sitemap expansion beyond approved scope.",
    "No fabricated content."
  ];
  const assumptions = new Set<string>(designSeed.assumptions ?? []);

  if (!hasSignal(snapshotResult, /(price|pricing|prices|цены|прайс)/iu)) {
    assumptions.add("Price-specific content stays placeholder-based until verified on the current site.");
  }
  if (!hasSignal(snapshotResult, /(staff|team|doctor|attorney|stylist|мастер|врач|адвокат)/iu)) {
    assumptions.add("Staff references are omitted or kept generic unless they are visible on the source site.");
  }
  if (!hasSignal(snapshotResult, /(review|testimonial|отзыв)/iu)) {
    assumptions.add("Trust blocks should avoid fabricated reviews and may rely on service clarity or proof alternatives.");
  }
  if (!hasSignal(snapshotResult, /(license|licensed|certified|сертифик|лиценз)/iu) && /(dental|clinic|law|legal|attorney|юрист|адвокат|клиник)/iu.test(getCombinedText(snapshotResult))) {
    assumptions.add("Medical, legal, or regulatory claims must remain placeholder-safe until verified.");
  }

  return {
    briefId: createId("brief", decision.leadKey),
    leadKey: decision.leadKey,
    decisionType: decision.finalDecision,
    designSeedRef,
    problemSummary: buildProblemSummary(qualification, decision),
    redesignGoals: buildRedesignGoals(qualification, decision, snapshotResult),
    preservedConstraints: buildPreservedConstraints(decision, designSeed),
    externalFlowHandling,
    editableScope: decision.finalDecision === "DEMO_EDITABLE_CONTENT" ? [...(decision.editableBlocks ?? [])] : [],
    pagePlanSummary,
    sectionPlan,
    copyDirection: buildCopyDirection(designSeed, qualification),
    visualDirection: buildVisualDirection(designSeed),
    nonGoals,
    assumptions: Array.from(assumptions),
    approvalRequired: decision.requiresHumanApproval || designSeed.requiresHumanApproval
  };
}

function buildProblemSummary(qualification: QualificationArtifact, decision: DecisionArtifact): string {
  const summaryParts = [
    qualification.evidence?.homepageFinding ?? "Current site needs a clearer conversion-first structure.",
    qualification.evidence?.serviceCoverage ?? "Service scope needs more defensible framing."
  ];

  if (decision.preserveExternalFlow) {
    summaryParts.push("Existing external conversion flow must stay preserved while surrounding UI becomes clearer.");
  }

  return summaryParts.join(" ");
}

function buildRedesignGoals(
  qualification: QualificationArtifact,
  decision: DecisionArtifact,
  snapshotResult: SnapshotExecutionResult
): string[] {
  const goals = [
    "Improve clarity of the core service offer and CTA hierarchy.",
    "Reduce conversion friction with a more defensible page structure."
  ];

  if (qualification.scores.contentSufficiency >= 6) {
    goals.push("Reuse verified site content where it is already strong enough for a bounded demo.");
  } else {
    goals.push("Use placeholders and assumptions instead of inventing unsupported detail.");
  }

  if (decision.preserveExternalFlow) {
    goals.push("Guide users into the preserved external booking or conversion flow without faking an internal flow.");
  }

  if (snapshotResult.artifact.selectionMode === "ONE_PAGE_VIRTUAL_SECTIONS") {
    goals.push("Keep the demo section-based and avoid artificial page expansion for a one-page lead.");
  }

  return goals;
}

function buildPreservedConstraints(decision: DecisionArtifact, designSeed: DesignSeedArtifact): string[] {
  return Array.from(
    new Set([
      ...designSeed.preservedConstraints,
      decision.finalDecision === "DEMO_FRONT_ONLY"
        ? "Editable scope is not allowed for this case."
        : "Editable scope must remain limited to already approved decision blocks."
    ])
  );
}

function mapExternalFlowHandling(
  decision: DecisionArtifact,
  snapshotResult: SnapshotExecutionResult
): RedesignBriefArtifact["externalFlowHandling"] {
  if (!decision.preserveExternalFlow) {
    return {
      mode: "not-applicable",
      notes: "No external booking or conversion flow was detected for this lead."
    };
  }

  const combined = getCombinedText(snapshotResult);
  if (/(booksy|calendly|acuity|yclients|widget)/iu.test(combined)) {
    return {
      mode: "preserved-booking-surface",
      notes: "Primary CTA continues to hand off into the existing external booking or widget surface."
    };
  }

  if (/(contact|booking|book|appointment|запись|контакт)/iu.test(combined)) {
    return {
      mode: "preserved-cta-path",
      notes: "CTA framing remains external and avoids pretending to own the downstream flow."
    };
  }

  return {
    mode: "preserved-integration-point",
    notes: "An external conversion touchpoint must be preserved even though the exact surface is only weakly observable."
  };
}

function buildPagePlanSummary(
  decision: DecisionArtifact,
  snapshotResult: SnapshotExecutionResult,
  needsContactBookingPage: boolean
): RedesignBriefArtifact["pagePlanSummary"] {
  if (snapshotResult.artifact.selectionMode === "ONE_PAGE_VIRTUAL_SECTIONS") {
    return {
      planType: "single-page-sections",
      plannedPages: [
        {
          pageKey: "single-page",
          pageType: "single-page",
          required: true
        }
      ],
      rationale: "One-page site evidence is stronger than forcing artificial internal pages."
    };
  }

  const plannedPages: RedesignBriefArtifact["pagePlanSummary"]["plannedPages"] = [
    {
      pageKey: "home",
      pageType: "home",
      required: true
    }
  ];

  let serviceIndex = 0;
  for (const entry of snapshotResult.artifact.entries) {
    if ((entry.slot === "KEY_SERVICE_1" || entry.slot === "KEY_SERVICE_2") && serviceIndex < 2) {
      serviceIndex += 1;
      plannedPages.push({
        pageKey: serviceIndex === 1 ? "key-service-1" : "key-service-2",
        pageType: "key-service",
        required: true
      });
    }
  }

  const hasContactSignals =
    snapshotResult.pageAnalyses.some((analysis) => analysis.hasContact || analysis.hasExternalBookingSignals) ||
    needsContactBookingPage;

  if (hasContactSignals) {
    plannedPages.push({
      pageKey: "contact-booking",
      pageType: "contact-booking",
      required: true
    });
  }

  return {
    planType: "multi-page-limited",
    plannedPages,
    rationale:
      decision.finalDecision === "DEMO_EDITABLE_CONTENT"
        ? "Page scope stays limited to the homepage, defensible service pages, and a contact or booking surface."
        : "Front-only page scope stays conservative: homepage, up to two key service pages, and contact or booking handling when justified."
  };
}

function buildSectionPlan(
  plannedPages: RedesignBriefArtifact["pagePlanSummary"]["plannedPages"]
): RedesignBriefArtifact["sectionPlan"] {
  return plannedPages.map((page) => {
    if (page.pageType === "single-page") {
      return {
        scopeRef: page.pageKey,
        sections: ["hero", "services", "proof", "contacts", "cta"],
        notes: "Keep the demo section-based and avoid fake extra pages."
      };
    }

    if (page.pageType === "home") {
      return {
        scopeRef: page.pageKey,
        sections: ["hero", "services overview", "trust/proof", "cta"],
        notes: "Homepage should clarify offer, trust, and the main conversion path."
      };
    }

    if (page.pageType === "key-service") {
      return {
        scopeRef: page.pageKey,
        sections: ["service intro", "service details", "proof", "cta"],
        notes: "Service page stays conversion-aware without adding unsupported detail."
      };
    }

    return {
      scopeRef: page.pageKey,
      sections: ["contact details", "booking handoff", "trust strip"],
      notes: "Contact or booking page makes the preserved handoff explicit."
    };
  });
}

function buildCopyDirection(designSeed: DesignSeedArtifact, qualification: QualificationArtifact): string[] {
  const direction = [
    `Tone: ${designSeed.copyProfile.tone}.`,
    `CTA bias: ${designSeed.copyProfile.ctaBias}.`,
    `Trust emphasis: ${designSeed.copyProfile.trustEmphasis}.`
  ];

  if (qualification.scores.contentSufficiency <= 5) {
    direction.push("Prefer short, evidence-backed copy and keep unsupported detail as placeholders.");
  }

  return direction;
}

function buildVisualDirection(designSeed: DesignSeedArtifact): string[] {
  return [
    ...designSeed.visualDirection,
    `Palette: ${designSeed.paletteDirection.join("; ")}.`,
    `Typography: ${designSeed.typographyDirection.join("; ")}.`,
    `Imagery: ${designSeed.imageryDirection.join("; ")}.`
  ];
}

function hasSignal(snapshotResult: SnapshotExecutionResult, pattern: RegExp): boolean {
  return pattern.test(getCombinedText(snapshotResult));
}

function getCombinedText(snapshotResult: SnapshotExecutionResult): string {
  return snapshotResult.pageAnalyses
    .flatMap((analysis) => [analysis.title, analysis.finalUrl, analysis.textSample])
    .join("\n");
}
