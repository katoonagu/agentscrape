import path from "node:path";
import type {
  DecisionArtifact,
  DemoBuildPlanArtifact,
  DesignSeedArtifact,
  LeadArtifact,
  PreviewBlocker,
  RedesignBriefArtifact
} from "../../../shared/src/contracts";
import { writeTextFile } from "../../../shared/src/fs";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";
import { renderPageCss } from "./render-page-css";
import { renderPageHtml, type PreviewDirectionCard, type PreviewRenderModel, type PreviewServiceCard } from "./render-page-html";

interface FrontOnlyPreviewBase {
  lead: LeadArtifact;
  decision: DecisionArtifact;
  designSeed: DesignSeedArtifact;
  redesignBrief: RedesignBriefArtifact;
  demoBuildPlan: DemoBuildPlanArtifact;
  snapshotResult: SnapshotExecutionResult;
  previewSiteDir: string;
}

export type FrontOnlyPreviewResult =
  | {
      status: "ready";
      indexPath: string;
      stylesPath: string;
      notes: string;
    }
  | {
      status: "blocked";
      notePath: string;
      blockers: PreviewBlocker[];
      notes: string;
    };

export async function generateFrontOnlyPreview(params: FrontOnlyPreviewBase): Promise<FrontOnlyPreviewResult> {
  const eligibility = evaluatePreviewEligibility(params);
  if (eligibility.status === "blocked") {
    const notePath = path.join(params.previewSiteDir, "BLOCKED.txt");
    await writeTextFile(notePath, renderBlockedNote(params, eligibility.blockers, eligibility.notes));
    return {
      status: "blocked",
      notePath,
      blockers: eligibility.blockers,
      notes: eligibility.notes.join(" ")
    };
  }

  const model = buildRenderModel(params, eligibility.draftNotes);
  const indexPath = path.join(params.previewSiteDir, "index.html");
  const stylesPath = path.join(params.previewSiteDir, "styles.css");

  await writeTextFile(stylesPath, renderPageCss(params.designSeed));
  await writeTextFile(indexPath, renderPageHtml(model));

  return {
    status: "ready",
    indexPath,
    stylesPath,
    notes: eligibility.draftNotes.length > 0
      ? `Draft local static preview generated. ${eligibility.draftNotes.join(" ")}`
      : "Draft local static preview generated."
  };
}

function evaluatePreviewEligibility(params: FrontOnlyPreviewBase):
  | { status: "blocked"; blockers: PreviewBlocker[]; notes: string[] }
  | { status: "ready"; draftNotes: string[] } {
  const { decision, redesignBrief, demoBuildPlan, snapshotResult } = params;

  if (decision.finalDecision !== "DEMO_FRONT_ONLY") {
    return {
      status: "blocked",
      blockers: ["GENERATION_BOUNDARY_VIOLATION"],
      notes: ["Actual local preview is only implemented for DEMO_FRONT_ONLY in this slice."]
    };
  }

  const blockers = new Set<PreviewBlocker>();
  const notes: string[] = [];

  if (!redesignBrief.designSeedRef) {
    blockers.add("MISSING_REDESIGN_BRIEF");
    notes.push("Redesign brief reference is missing.");
  }

  if (!demoBuildPlan.buildPlanId) {
    blockers.add("MISSING_DEMO_BUILD_PLAN");
    notes.push("Demo build plan is missing.");
  }

  const hardStopReasons = new Set([
    "EXTERNAL_FLOW_AMBIGUOUS",
    "PAGE_SCOPE_NOT_DEFENSIBLE",
    "EDITABLE_SCOPE_EXCEEDED",
    "DIRECTION_CONFLICT_WITH_SITE_REALITY"
  ]);
  const hardStops = demoBuildPlan.stopReasons.filter((reason) => hardStopReasons.has(reason));
  if (hardStops.length > 0) {
    blockers.add("GENERATION_BOUNDARY_VIOLATION");
    notes.push(`Preview remains blocked by hard stop reasons: ${hardStops.join(", ")}.`);
  }

  if (
    redesignBrief.externalFlowHandling.mode !== "not-applicable" &&
    !snapshotResult.primaryExternalFlowUrl
  ) {
    blockers.add("GENERATION_BOUNDARY_VIOLATION");
    notes.push("Preview needs a defensible preserved external-flow URL, but none was captured during the current run.");
  }

  if (blockers.size > 0) {
    return {
      status: "blocked",
      blockers: Array.from(blockers),
      notes
    };
  }

  const draftNotes: string[] = [];
  if (demoBuildPlan.approvalRequired) {
    draftNotes.push("Approval is still required. This preview is a draft, not an approved production result.");
  }

  const softStopReasons = demoBuildPlan.stopReasons.filter((reason) =>
    ["CONTENT_GAP_MATERIAL", "LOW_SEED_CONFIDENCE", "COMPLEXITY_BORDERLINE"].includes(reason)
  );
  if (softStopReasons.length > 0) {
    draftNotes.push(`Generation planning surfaced soft caution flags: ${softStopReasons.join(", ")}.`);
  }

  if ((demoBuildPlan.placeholders?.length ?? 0) > 0) {
    draftNotes.push("Placeholders remain in the draft where the current site does not justify exact detail.");
  }

  if ((demoBuildPlan.assumptions?.length ?? 0) > 0) {
    draftNotes.push("Assumptions remain visible and should be reviewed before any deploy-like step.");
  }

  return {
    status: "ready",
    draftNotes
  };
}

function buildRenderModel(params: FrontOnlyPreviewBase, draftNotes: string[]): PreviewRenderModel {
  const { lead, designSeed, redesignBrief, demoBuildPlan, snapshotResult } = params;
  const homeAnalysis = snapshotResult.pageAnalyses.find((analysis) => analysis.slot === "HOME");
  const heroTitle = sanitizeHeadline(homeAnalysis?.title, lead.businessName);
  const heroBody = compactSentence(
    [redesignBrief.problemSummary, redesignBrief.redesignGoals[0], redesignBrief.redesignGoals[1]]
      .filter(Boolean)
      .join(" ")
  );
  const plannedPages = redesignBrief.pagePlanSummary.plannedPages
    .filter((page) => page.pageKey !== "home")
    .map((page) => page.pageKey.replaceAll("-", " "));

  return {
    businessName: lead.businessName,
    pageTitle: `${lead.businessName} - local draft preview`,
    heroEyebrow: `${designSeed.copyProfile.tone} marketing layer`,
    heroTitle,
    heroBody,
    primaryCtaLabel: resolvePrimaryCtaLabel(redesignBrief, designSeed),
    primaryCtaHref:
      redesignBrief.externalFlowHandling.mode !== "not-applicable" && snapshotResult.primaryExternalFlowUrl
        ? snapshotResult.primaryExternalFlowUrl
        : "#contact",
    secondaryCtaLabel: "See planned scope",
    plannedPages,
    draftNotes,
    assumptions: demoBuildPlan.assumptions ?? redesignBrief.assumptions ?? [],
    serviceCards: buildServiceCards(snapshotResult, redesignBrief),
    trustPoints: buildTrustPoints(demoBuildPlan, redesignBrief),
    contactPoints: buildContactPoints(snapshotResult, redesignBrief),
    directionCards: buildDirectionCards(designSeed, redesignBrief, demoBuildPlan),
    externalFlowNote:
      redesignBrief.externalFlowHandling.mode !== "not-applicable"
        ? redesignBrief.externalFlowHandling.notes
        : undefined
  };
}

function buildServiceCards(
  snapshotResult: SnapshotExecutionResult,
  redesignBrief: RedesignBriefArtifact
): PreviewServiceCard[] {
  const pageCards = snapshotResult.pageAnalyses
    .filter((analysis) => analysis.slot === "KEY_SERVICE_1" || analysis.slot === "KEY_SERVICE_2")
    .map((analysis) => ({
      title: sanitizeHeadline(analysis.title, "Service focus"),
      body: compactSentence(
        analysis.textSample.slice(0, 180) || "Current-site service context supports a bounded, homepage-led preview."
      )
    }))
    .slice(0, 2);

  if (pageCards.length >= 2) {
    return pageCards;
  }

  const genericCards: PreviewServiceCard[] = [
    {
      title: "Clear service entry point",
      body: redesignBrief.redesignGoals[0] ?? "Use the homepage to make the main offer immediately legible."
    },
    {
      title: "Conservative proof framing",
      body: "Trust stays anchored in verified site cues and neutral proof language instead of fabricated testimonials."
    },
    {
      title: "Bounded next step",
      body: redesignBrief.externalFlowHandling.mode === "not-applicable"
        ? "The CTA stays within the approved front-only marketing layer."
        : "The draft keeps the external conversion handoff explicit and preserved."
    }
  ];

  return [...pageCards, ...genericCards].slice(0, 3);
}

function buildTrustPoints(
  demoBuildPlan: DemoBuildPlanArtifact,
  redesignBrief: RedesignBriefArtifact
): string[] {
  const points = [
    "The draft reuses verified current-site framing before adding any new promise-like copy.",
    "Unsupported trust proof remains placeholder-safe instead of turning into invented reviews or certifications."
  ];

  if (demoBuildPlan.externalFlowHandling.mode !== "not-applicable") {
    points.push("External conversion handling stays preserved and is not replaced with fake internal booking logic.");
  }

  if ((demoBuildPlan.placeholders?.length ?? 0) > 0) {
    points.push(`Open content gaps remain visible in ${demoBuildPlan.placeholders?.length ?? 0} placeholder area(s).`);
  }

  if (redesignBrief.approvalRequired) {
    points.push("Operator approval is still required before any deploy-like step.");
  }

  return points;
}

function buildContactPoints(
  snapshotResult: SnapshotExecutionResult,
  redesignBrief: RedesignBriefArtifact
): string[] {
  const points: string[] = [];
  const hasContactSignals = snapshotResult.pageAnalyses.some((analysis) => analysis.hasContact);

  if (redesignBrief.externalFlowHandling.mode !== "not-applicable" && snapshotResult.primaryExternalFlowUrl) {
    points.push(`Primary CTA hands off to the preserved external flow: ${snapshotResult.primaryExternalFlowUrl}`);
  } else if (redesignBrief.externalFlowHandling.mode !== "not-applicable") {
    points.push("External flow stays preserved, but the exact link must be reviewed before a preview can point to it.");
  }

  points.push(
    hasContactSignals
      ? "Use verified contact details from the current site when moving beyond the draft."
      : "Contact details remain placeholder-safe until they are explicitly verified."
  );
  points.push("No internal booking engine, admin surface, or hidden form logic is introduced in this slice.");

  return points;
}

function buildDirectionCards(
  designSeed: DesignSeedArtifact,
  redesignBrief: RedesignBriefArtifact,
  demoBuildPlan: DemoBuildPlanArtifact
): PreviewDirectionCard[] {
  return [
    {
      title: "Copy direction",
      items: redesignBrief.copyDirection.slice(0, 3)
    },
    {
      title: "Visual direction",
      items: [
        ...designSeed.visualDirection.slice(0, 2),
        `Palette: ${designSeed.paletteDirection.join("; ")}`,
        `Typography: ${designSeed.typographyDirection.join("; ")}`
      ].slice(0, 4)
    },
    {
      title: "Draft constraints",
      items: [
        ...designSeed.preservedConstraints.slice(0, 2),
        ...(demoBuildPlan.placeholders?.slice(0, 2).map((placeholder) => placeholder.notes) ?? [])
      ].slice(0, 4)
    }
  ];
}

function resolvePrimaryCtaLabel(
  redesignBrief: RedesignBriefArtifact,
  designSeed: DesignSeedArtifact
): string {
  if (redesignBrief.externalFlowHandling.mode === "preserved-booking-surface") {
    return "Continue to booking";
  }

  if (redesignBrief.externalFlowHandling.mode === "preserved-cta-path") {
    return "Continue to the next step";
  }

  const ctaBias = designSeed.copyProfile.ctaBias.toLowerCase();
  if (ctaBias.includes("contact")) {
    return "Contact the team";
  }

  if (ctaBias.includes("consult")) {
    return "Request a consultation";
  }

  return "See the next step";
}

function renderBlockedNote(
  params: FrontOnlyPreviewBase,
  blockers: PreviewBlocker[],
  notes: string[]
): string {
  return [
    "Local preview bundle was not generated for this lead.",
    "",
    `leadKey: ${params.lead.leadKey}`,
    `decision: ${params.decision.finalDecision}`,
    `blockers: ${blockers.join(", ")}`,
    "",
    "notes:",
    ...notes.map((note) => `- ${note}`),
    "",
    "This slice only creates an actual preview bundle for DEMO_FRONT_ONLY leads without hard preview blockers."
  ].join("\n");
}

function sanitizeHeadline(value: string | undefined, fallback: string): string {
  const normalized = compactSentence(value ?? "");
  const beforePipe = normalized.split("|")[0]?.trim() ?? "";
  const beforeDash = beforePipe.split(" - ")[0]?.trim() ?? beforePipe;
  const candidate = beforeDash || fallback;
  return candidate.length > 72 ? `${candidate.slice(0, 69).trim()}...` : candidate;
}

function compactSentence(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}
