export type ScaffoldSectionId = "hero" | "planned-pages" | "services" | "trust" | "contact";

export interface ScaffoldPlannedPage {
  pageKey: string;
  pageType: string;
  label: string;
  required: boolean;
}

export interface ScaffoldHero {
  eyebrow: string;
  title: string;
  body: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  note?: string;
}

export interface ScaffoldServiceCard {
  title: string;
  body: string;
  status: "verified" | "generic-draft";
}

export interface ScaffoldTrustSection {
  heading: string;
  body: string;
  points: string[];
}

export interface ScaffoldContactSection {
  heading: string;
  body: string;
  points: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export interface SiteScaffoldContentModel {
  meta: {
    leadKey: string;
    businessName: string;
    decisionType: string;
    sourceArtifacts: {
      snapshotRef?: string;
      qualificationRef?: string;
      decisionRef: string;
      designSeedRef: string;
      redesignBriefRef: string;
      demoBuildPlanRef: string;
      previewManifestRef: string;
    };
  };
  draft: {
    isDraft: true;
    approvalRequired: boolean;
    generationReady: boolean;
    notes: string[];
    assumptions: string[];
    placeholderSummaries: string[];
  };
  theme: {
    tasteProfile: {
      designVariance: number;
      motionIntensity: number;
      visualDensity: number;
    };
    paletteDirection: string[];
    typographyDirection: string[];
    visualDirection: string[];
    imageryDirection: string[];
  };
  page: {
    sectionOrder: ScaffoldSectionId[];
    plannedPages: ScaffoldPlannedPage[];
    hero: ScaffoldHero;
    services: ScaffoldServiceCard[];
    trust: ScaffoldTrustSection;
    contact: ScaffoldContactSection;
  };
  guidance: {
    internalSkills: string[];
    externalSkills: string[];
    stitchCompatibleDesignMd: boolean;
    precedenceNote: string;
    authoringRules: string[];
  };
}
