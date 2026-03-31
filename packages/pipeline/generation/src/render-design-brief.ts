import type { RedesignBriefArtifact } from "../../../shared/src/contracts";
import { writeTextFile } from "../../../shared/src/fs";

export async function renderDesignBriefProjection(
  redesignBrief: RedesignBriefArtifact,
  filePath: string
): Promise<void> {
  const lines: string[] = [
    "# Lead / decision context",
    "",
    `- \`leadKey\`: ${redesignBrief.leadKey}`,
    `- \`decisionType\`: ${redesignBrief.decisionType}`,
    `- \`designSeedRef\`: ${redesignBrief.designSeedRef}`,
    `- \`approvalRequired\`: ${String(redesignBrief.approvalRequired)}`,
    "",
    "# Problem summary",
    "",
    `- ${redesignBrief.problemSummary}`,
    "",
    "# Redesign goals",
    "",
    ...toBulletLines(redesignBrief.redesignGoals),
    "",
    "# Preserved constraints",
    "",
    ...toBulletLines(redesignBrief.preservedConstraints),
    "",
    "# External flow handling",
    "",
    `- \`mode\`: ${redesignBrief.externalFlowHandling.mode}`,
    `- \`notes\`: ${redesignBrief.externalFlowHandling.notes}`,
    "",
    "# Editable scope",
    "",
    ...(redesignBrief.editableScope.length > 0 ? toBulletLines(redesignBrief.editableScope) : ["- none"]),
    "",
    "# Page plan",
    "",
    `- \`planType\`: ${redesignBrief.pagePlanSummary.planType}`,
    ...redesignBrief.pagePlanSummary.plannedPages.map(
      (page) => `- ${page.pageKey} (${page.pageType})${page.required ? " [required]" : ""}`
    ),
    `- rationale: ${redesignBrief.pagePlanSummary.rationale}`,
    "",
    "# Section plan",
    "",
    ...redesignBrief.sectionPlan.flatMap((entry) => [
      `- ${entry.scopeRef}: ${entry.sections.join(", ")}`,
      ...(entry.notes ? [`- notes: ${entry.notes}`] : [])
    ]),
    "",
    "# Copy direction",
    "",
    ...toBulletLines(redesignBrief.copyDirection),
    "",
    "# Visual direction",
    "",
    ...toBulletLines(redesignBrief.visualDirection),
    "",
    "# Non-goals",
    "",
    ...toBulletLines(redesignBrief.nonGoals),
    "",
    "# Assumptions",
    "",
    ...(redesignBrief.assumptions && redesignBrief.assumptions.length > 0
      ? toBulletLines(redesignBrief.assumptions)
      : ["- none"])
  ];

  await writeTextFile(filePath, `${lines.join("\n")}\n`);
}

function toBulletLines(values: string[]): string[] {
  return values.map((value) => `- ${value}`);
}
