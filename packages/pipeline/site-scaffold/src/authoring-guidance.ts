export interface AuthoringGuidance {
  internalSkills: string[];
  externalSkills: string[];
  stitchCompatibleDesignMd: boolean;
  precedenceNote: string;
  authoringRules: string[];
}

export function getAuthoringGuidance(): AuthoringGuidance {
  return {
    internalSkills: ["atomika-conversion", "copy-guidelines", "qa-review"],
    externalSkills: ["taste-design", "full-output-enforcement", "stitch-design"],
    stitchCompatibleDesignMd: true,
    precedenceNote:
      "Structured artifacts and repo-authored internal skills override external style guidance whenever they conflict.",
    authoringRules: [
      "Keep the scaffold homepage-only and front-only.",
      "Do not widen editable scope beyond the decision artifact.",
      "Preserve external conversion flow as an explicit external CTA path when present.",
      "Do not fabricate prices, staff, reviews, licenses, guarantees, or regulated claims.",
      "Keep incomplete content visible as placeholders, assumptions, or draft notes.",
      "Generate complete files without omission comments or lazy stubs."
    ]
  };
}
