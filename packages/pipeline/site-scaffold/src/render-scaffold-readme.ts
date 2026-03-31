import type { SiteScaffoldContentModel } from "./model";

export function renderScaffoldReadme(params: {
  contentModel: SiteScaffoldContentModel;
  preservedExternalFlow: boolean;
}): string {
  const { contentModel, preservedExternalFlow } = params;
  const sourceEntries = Object.entries(contentModel.meta.sourceArtifacts)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([label, value]) => `- \`${label}\`: ${value as string}`);

  const lines = [
    "# Draft Scaffold README",
    "",
    "## What This Bundle Is",
    "",
    "- Draft-only, front-only Next App Router scaffold generated from the current runtime artifacts.",
    "- Intended for further Codex or operator refinement, not for direct deploy.",
    `- Decision type: \`${contentModel.meta.decisionType}\`.`,
    `- Approval required: \`${String(contentModel.draft.approvalRequired)}\`.`,
    `- Generation ready: \`${String(contentModel.draft.generationReady)}\`.`,
    "",
    "## Source Artifacts",
    "",
    ...sourceEntries,
    "",
    "## Boundaries",
    "",
    "- Homepage only in this slice.",
    "- No backend, CMS, CRM, admin surface, API routes, or editable runtime.",
    "- No fabricated prices, staff bios, reviews, certifications, guarantees, or regulated claims.",
    preservedExternalFlow
      ? "- Preserved external flow remains an explicit external CTA path. It is not internalized."
      : "- No external conversion flow was preserved for this scaffold.",
    "",
    "## Draft Caveats",
    "",
    ...(contentModel.draft.notes.length > 0
      ? contentModel.draft.notes.map((note) => `- ${note}`)
      : ["- No extra draft caveats were recorded beyond the default draft status."]),
    ...(contentModel.draft.assumptions.length > 0
      ? ["", "## Assumptions", "", ...contentModel.draft.assumptions.map((item) => `- ${item}`)]
      : []),
    ...(contentModel.draft.placeholderSummaries.length > 0
      ? ["", "## Placeholders", "", ...contentModel.draft.placeholderSummaries.map((item) => `- ${item}`)]
      : []),
    "",
    "## Skill Guidance",
    "",
    `- Internal skills: ${contentModel.guidance.internalSkills.join(", ")}.`,
    `- External guidance mapping: ${contentModel.guidance.externalSkills.join(", ")}.`,
    `- Stitch-compatible DESIGN.md: ${String(contentModel.guidance.stitchCompatibleDesignMd)}.`,
    "",
    "## Local Commands",
    "",
    "```bash",
    "npm install",
    "npm run dev",
    "```",
    "",
    "The generated scaffold is intentionally minimal. Use it as a bounded draft code bundle, not as a production-ready app."
  ];

  return `${lines.join("\n")}\n`;
}
