import type { DesignSeedArtifact, DemoBuildPlanArtifact, RedesignBriefArtifact } from "../../../shared/src/contracts";
import type { SiteScaffoldContentModel } from "./model";

export function renderDesignMd(params: {
  designSeed: DesignSeedArtifact;
  redesignBrief: RedesignBriefArtifact;
  demoBuildPlan: DemoBuildPlanArtifact;
  contentModel: SiteScaffoldContentModel;
}): string {
  const { designSeed, redesignBrief, demoBuildPlan, contentModel } = params;
  const lines = [
    "# DESIGN.md",
    "",
    "## Visual Theme & Atmosphere",
    `- Atmosphere: ${designSeed.visualDirection.join(" ")}`,
    `- Taste profile: variance ${designSeed.tasteProfile.designVariance}, motion ${designSeed.tasteProfile.motionIntensity}, density ${designSeed.tasteProfile.visualDensity}.`,
    `- Draft goal: ${redesignBrief.redesignGoals[0] ?? "Clarify the main service offer and conversion path."}`,
    "",
    "## Color Palette & Roles",
    ...designSeed.paletteDirection.map((entry) => `- ${entry}`),
    "",
    "## Typography Rules",
    ...designSeed.typographyDirection.map((entry) => `- ${entry}`),
    `- Headline style: ${designSeed.copyProfile.headlineStyle}.`,
    "",
    "## Component Stylings",
    "- Hero stays conversion-led, not slogan-led.",
    "- Service cards remain bounded and placeholder-safe when source detail is thin.",
    "- Trust sections use neutral credibility framing instead of fabricated testimonials or badges.",
    "- Contact handling keeps the approved external or front-layer CTA path explicit.",
    "",
    "## Layout Principles",
    `- Page plan: ${redesignBrief.pagePlanSummary.planType}.`,
    ...redesignBrief.pagePlanSummary.plannedPages.map((page) => `- ${page.pageKey}: ${page.pageType}${page.required ? " [required]" : ""}`),
    "- Homepage-only scaffold in this slice. Additional pages stay represented as informational planned scope only.",
    "",
    "## Motion & Interaction",
    `- Motion intensity target: ${designSeed.tasteProfile.motionIntensity}.`,
    "- Keep motion restrained and optional. No heavy gimmicks or decorative animation layers.",
    "- External CTA handoff stays explicit and never becomes fake internal booking logic.",
    "",
    "## Draft Constraints",
    ...designSeed.preservedConstraints.map((entry) => `- ${entry}`),
    `- Approval required: ${String(redesignBrief.approvalRequired)}.`,
    `- Generation ready: ${String(demoBuildPlan.generationReady)}.`,
    ...contentModel.draft.placeholderSummaries.map((entry) => `- Placeholder: ${entry}`),
    ...contentModel.draft.assumptions.map((entry) => `- Assumption: ${entry}`),
    "",
    "## Anti-Patterns",
    "- No fabricated prices, staff bios, reviews, certifications, guarantees, or regulated claims.",
    "- No CMS, CRM, admin panel, dashboard, or editable runtime in this scaffold.",
    "- No page-scope widening beyond the structured build plan.",
    "- No preserved external flow replacement with fake internal logic.",
    "- No lazy stubs or omission comments in generated files.",
    "",
    "## Guidance Sources",
    `- Internal skills: ${contentModel.guidance.internalSkills.join(", ")}.`,
    `- External guidance mapping: ${contentModel.guidance.externalSkills.join(", ")}.`,
    `- Stitch-compatible handoff: ${String(contentModel.guidance.stitchCompatibleDesignMd)}.`,
    `- Precedence: ${contentModel.guidance.precedenceNote}`,
    `- Build-plan rationale: ${demoBuildPlan.pagePlan.rationale ?? redesignBrief.pagePlanSummary.rationale}`
  ];

  return `${lines.join("\n")}\n`;
}
