import path from "node:path";
import type {
  DecisionArtifact,
  DemoBuildPlanArtifact,
  DesignSeedArtifact,
  LeadArtifact,
  QualificationArtifact,
  RedesignBriefArtifact
} from "../../../shared/src/contracts";
import { slugify } from "../../../shared/src/ids";
import { writeJsonFile, writeTextFile } from "../../../shared/src/fs";
import type { SnapshotExecutionResult } from "../../snapshot/src/capture-site-snapshot";
import { getAuthoringGuidance } from "./authoring-guidance";
import type {
  ScaffoldContactSection,
  ScaffoldHero,
  ScaffoldPlannedPage,
  ScaffoldSectionId,
  ScaffoldServiceCard,
  ScaffoldTrustSection,
  SiteScaffoldContentModel
} from "./model";
import { renderDesignMd } from "./render-design-md";
import { renderNextGlobalsCss } from "./render-next-globals-css";
import { renderNextLayout } from "./render-next-layout";
import { renderNextPage } from "./render-next-page";
import { renderScaffoldReadme } from "./render-scaffold-readme";
import { renderSiteComponents } from "./render-site-components";
import { renderSiteContentJson } from "./render-site-content-json";

export interface SiteScaffoldSourceRefs {
  snapshotRef?: string;
  qualificationRef?: string;
  decisionRef: string;
  designSeedRef: string;
  redesignBriefRef: string;
  demoBuildPlanRef: string;
  previewManifestRef: string;
}

export interface SiteScaffoldResult {
  scaffoldRoot: string;
  readmePath: string;
  designMdPath: string;
  contentPath: string;
  notes: string;
}

export async function generateSiteScaffold(params: {
  lead: LeadArtifact;
  qualification: QualificationArtifact;
  decision: DecisionArtifact;
  designSeed: DesignSeedArtifact;
  redesignBrief: RedesignBriefArtifact;
  demoBuildPlan: DemoBuildPlanArtifact;
  snapshotResult: SnapshotExecutionResult;
  scaffoldRoot: string;
  sourceRefs: SiteScaffoldSourceRefs;
}): Promise<SiteScaffoldResult> {
  const {
    lead,
    qualification,
    decision,
    designSeed,
    redesignBrief,
    demoBuildPlan,
    snapshotResult,
    scaffoldRoot,
    sourceRefs
  } = params;

  if (decision.finalDecision !== "DEMO_FRONT_ONLY") {
    throw new Error(`Site scaffold runtime is implemented only for DEMO_FRONT_ONLY, got ${decision.finalDecision}.`);
  }

  if (redesignBrief.externalFlowHandling.mode !== "not-applicable" && !snapshotResult.primaryExternalFlowUrl) {
    throw new Error("Site scaffold requires a defensible external flow URL when the current case preserves external flow.");
  }

  const contentModel = buildContentModel({
    lead,
    qualification,
    decision,
    designSeed,
    redesignBrief,
    demoBuildPlan,
    snapshotResult,
    sourceRefs
  });

  const componentFiles = renderSiteComponents();
  const designMd = renderDesignMd({
    designSeed,
    redesignBrief,
    demoBuildPlan,
    contentModel
  });
  const scaffoldReadme = renderScaffoldReadme({
    contentModel,
    preservedExternalFlow: redesignBrief.externalFlowHandling.mode !== "not-applicable"
  });

  const scaffoldPackageJson = buildScaffoldPackageJson(lead);
  const scaffoldTsconfig = buildScaffoldTsconfig();
  const nextEnv = buildNextEnvFile();

  await writeJsonFile(path.join(scaffoldRoot, "package.json"), scaffoldPackageJson);
  await writeTextFile(path.join(scaffoldRoot, "tsconfig.json"), scaffoldTsconfig);
  await writeTextFile(path.join(scaffoldRoot, "next-env.d.ts"), nextEnv);
  await writeTextFile(path.join(scaffoldRoot, "app", "layout.tsx"), renderNextLayout());
  await writeTextFile(path.join(scaffoldRoot, "app", "page.tsx"), renderNextPage());
  await writeTextFile(path.join(scaffoldRoot, "app", "globals.css"), renderNextGlobalsCss(designSeed));
  await writeTextFile(path.join(scaffoldRoot, "components", "site", "types.ts"), componentFiles.typeDefinitions);
  await writeTextFile(path.join(scaffoldRoot, "components", "site", "DraftBanner.tsx"), componentFiles.draftBanner);
  await writeTextFile(path.join(scaffoldRoot, "components", "site", "HeroSection.tsx"), componentFiles.heroSection);
  await writeTextFile(path.join(scaffoldRoot, "components", "site", "ServicesSection.tsx"), componentFiles.servicesSection);
  await writeTextFile(path.join(scaffoldRoot, "components", "site", "TrustSection.tsx"), componentFiles.trustSection);
  await writeTextFile(path.join(scaffoldRoot, "components", "site", "ContactSection.tsx"), componentFiles.contactSection);
  await writeTextFile(path.join(scaffoldRoot, "components", "site", "PlannedPagesNav.tsx"), componentFiles.plannedPagesNav);
  const contentPath = path.join(scaffoldRoot, "content", "site-content.json");
  await writeTextFile(contentPath, renderSiteContentJson(contentModel));
  const designMdPath = path.join(scaffoldRoot, "DESIGN.md");
  await writeTextFile(designMdPath, designMd);
  const readmePath = path.join(scaffoldRoot, "README.md");
  await writeTextFile(readmePath, scaffoldReadme);

  return {
    scaffoldRoot,
    readmePath,
    designMdPath,
    contentPath,
    notes: "Draft Next App Router scaffold generated for DEMO_FRONT_ONLY."
  };
}

function buildContentModel(params: {
  lead: LeadArtifact;
  qualification: QualificationArtifact;
  decision: DecisionArtifact;
  designSeed: DesignSeedArtifact;
  redesignBrief: RedesignBriefArtifact;
  demoBuildPlan: DemoBuildPlanArtifact;
  snapshotResult: SnapshotExecutionResult;
  sourceRefs: SiteScaffoldSourceRefs;
}): SiteScaffoldContentModel {
  const {
    lead,
    qualification,
    decision,
    designSeed,
    redesignBrief,
    demoBuildPlan,
    snapshotResult,
    sourceRefs
  } = params;
  const guidance = getAuthoringGuidance();
  const placeholderSummaries = (demoBuildPlan.placeholders ?? []).map((item) => item.notes);
  const notes = buildDraftNotes(redesignBrief, demoBuildPlan, placeholderSummaries);

  return {
    meta: {
      leadKey: lead.leadKey,
      businessName: lead.businessName,
      decisionType: decision.finalDecision,
      sourceArtifacts: {
        snapshotRef: sourceRefs.snapshotRef,
        qualificationRef: sourceRefs.qualificationRef,
        decisionRef: sourceRefs.decisionRef,
        designSeedRef: sourceRefs.designSeedRef,
        redesignBriefRef: sourceRefs.redesignBriefRef,
        demoBuildPlanRef: sourceRefs.demoBuildPlanRef,
        previewManifestRef: sourceRefs.previewManifestRef
      }
    },
    draft: {
      isDraft: true,
      approvalRequired: redesignBrief.approvalRequired,
      generationReady: demoBuildPlan.generationReady,
      notes,
      assumptions: redesignBrief.assumptions ?? [],
      placeholderSummaries
    },
    theme: {
      tasteProfile: designSeed.tasteProfile,
      paletteDirection: designSeed.paletteDirection,
      typographyDirection: designSeed.typographyDirection,
      visualDirection: designSeed.visualDirection,
      imageryDirection: designSeed.imageryDirection
    },
    page: {
      sectionOrder: buildSectionOrder(demoBuildPlan),
      plannedPages: buildPlannedPages(redesignBrief.pagePlanSummary.plannedPages),
      hero: buildHero(lead, qualification, designSeed, redesignBrief, snapshotResult),
      services: buildServices(snapshotResult, redesignBrief),
      trust: buildTrust(designSeed, redesignBrief, demoBuildPlan),
      contact: buildContact(designSeed, redesignBrief, snapshotResult)
    },
    guidance: {
      internalSkills: guidance.internalSkills,
      externalSkills: guidance.externalSkills,
      stitchCompatibleDesignMd: guidance.stitchCompatibleDesignMd,
      precedenceNote: guidance.precedenceNote,
      authoringRules: guidance.authoringRules
    }
  };
}

function buildDraftNotes(
  redesignBrief: RedesignBriefArtifact,
  demoBuildPlan: DemoBuildPlanArtifact,
  placeholderSummaries: string[]
): string[] {
  const notes = ["Draft scaffold only. This bundle is not deploy-ready or operator-approved by default."];

  if (redesignBrief.approvalRequired) {
    notes.push("Approval is still required before any deploy-like step.");
  }

  if (!demoBuildPlan.generationReady) {
    notes.push(`Generation planning still carries caution flags: ${demoBuildPlan.stopReasons.join(", ")}.`);
  }

  if (placeholderSummaries.length > 0) {
    notes.push("Placeholder-safe areas remain visible where source material does not justify precise copy.");
  }

  if ((redesignBrief.assumptions?.length ?? 0) > 0) {
    notes.push("Assumptions remain explicit and should be reviewed before any wider implementation step.");
  }

  return notes;
}

function buildSectionOrder(demoBuildPlan: DemoBuildPlanArtifact): ScaffoldSectionId[] {
  const homeSectionPlan = demoBuildPlan.sectionPlan.find(
    (entry) => entry.pageKey === "home" || entry.pageKey === "single-page"
  );
  const mapped = new Set<ScaffoldSectionId>(["hero"]);

  for (const section of homeSectionPlan?.sections ?? []) {
    const normalized = section.toLowerCase();
    if (/(service)/u.test(normalized)) {
      mapped.add("services");
    }
    if (/(proof|trust|review)/u.test(normalized)) {
      mapped.add("trust");
    }
    if (/(contact|booking|cta)/u.test(normalized)) {
      mapped.add("contact");
    }
  }

  if (demoBuildPlan.pagePlan.pages.length > 1) {
    mapped.add("planned-pages");
  }

  const ordered: ScaffoldSectionId[] = ["hero"];
  if (mapped.has("planned-pages")) {
    ordered.push("planned-pages");
  }
  if (mapped.has("services")) {
    ordered.push("services");
  }
  if (mapped.has("trust")) {
    ordered.push("trust");
  }
  if (mapped.has("contact")) {
    ordered.push("contact");
  }

  if (!ordered.includes("services")) {
    ordered.push("services");
  }
  if (!ordered.includes("trust")) {
    ordered.push("trust");
  }
  if (!ordered.includes("contact")) {
    ordered.push("contact");
  }

  return ordered;
}

function buildPlannedPages(
  pages: RedesignBriefArtifact["pagePlanSummary"]["plannedPages"]
): ScaffoldPlannedPage[] {
  return pages.map((page) => ({
    pageKey: page.pageKey,
    pageType: page.pageType,
    label: humanizePageKey(page.pageKey, page.pageType),
    required: page.required
  }));
}

function buildHero(
  lead: LeadArtifact,
  qualification: QualificationArtifact,
  designSeed: DesignSeedArtifact,
  redesignBrief: RedesignBriefArtifact,
  snapshotResult: SnapshotExecutionResult
): ScaffoldHero {
  const homeAnalysis = snapshotResult.pageAnalyses.find((analysis) => analysis.slot === "HOME");
  const heroTitle = resolveHeroTitle(lead, qualification, homeAnalysis?.title);
  const heroBody = buildHeroBody(heroTitle, redesignBrief.problemSummary, redesignBrief.redesignGoals);

  return {
    eyebrow: `${lead.businessName} / draft marketing layer`,
    title: heroTitle,
    body: heroBody,
    primaryCtaLabel: resolvePrimaryCtaLabel(redesignBrief, designSeed),
    primaryCtaHref:
      redesignBrief.externalFlowHandling.mode !== "not-applicable" && snapshotResult.primaryExternalFlowUrl
        ? snapshotResult.primaryExternalFlowUrl
        : "#contact",
    secondaryCtaLabel: "See planned scope",
    secondaryCtaHref: redesignBrief.pagePlanSummary.plannedPages.length > 1 ? "#planned-scope" : "#services",
    note:
      redesignBrief.externalFlowHandling.mode !== "not-applicable"
        ? redesignBrief.externalFlowHandling.notes
        : "CTA remains inside the approved front-only marketing layer."
  };
}

function buildServices(
  snapshotResult: SnapshotExecutionResult,
  redesignBrief: RedesignBriefArtifact
): ScaffoldServiceCard[] {
  const verifiedCards = snapshotResult.pageAnalyses
    .filter((analysis) => analysis.slot === "KEY_SERVICE_1" || analysis.slot === "KEY_SERVICE_2")
    .map((analysis) => ({
      title: sanitizeHeadline(analysis.title, "Service focus"),
      body: compactSentence(
        analysis.textSample.slice(0, 180) ||
          "Current-site service cues support a bounded, front-only homepage scaffold."
      ),
      status: "verified" as const
    }))
    .slice(0, 2);

  const fallbackCards: ScaffoldServiceCard[] = [
    {
      title: "Clear first-step offer framing",
      body: redesignBrief.redesignGoals[0] ?? "Make the main service offer immediately legible on the homepage.",
      status: "generic-draft"
    },
    {
      title: "Proof without invented detail",
      body: "Trust stays tied to verified site cues and neutral evidence-safe framing.",
      status: "generic-draft"
    },
    {
      title: "Bounded conversion handoff",
      body:
        redesignBrief.externalFlowHandling.mode === "not-applicable"
          ? "The scaffold keeps the next step inside the approved front-layer CTA path."
          : "The scaffold keeps the live conversion step external and explicit.",
      status: "generic-draft"
    }
  ];

  return [...verifiedCards, ...fallbackCards].slice(0, 3);
}

function buildTrust(
  designSeed: DesignSeedArtifact,
  redesignBrief: RedesignBriefArtifact,
  demoBuildPlan: DemoBuildPlanArtifact
): ScaffoldTrustSection {
  const points = [
    "Current-site proof stays evidence-aware before any stronger trust claim is introduced.",
    "Unsupported testimonials, logos, certifications, or guarantees stay out of the draft."
  ];

  if (redesignBrief.externalFlowHandling.mode !== "not-applicable") {
    points.push("External conversion flow remains preserved and is not replaced by fake internal booking logic.");
  }

  if ((demoBuildPlan.placeholders?.length ?? 0) > 0) {
    points.push(`Open content gaps remain visible in ${demoBuildPlan.placeholders?.length} placeholder area(s).`);
  }

  return {
    heading: "Trust stays conservative, explicit, and source-aware.",
    body: `Trust emphasis: ${designSeed.copyProfile.trustEmphasis}.`,
    points
  };
}

function buildContact(
  designSeed: DesignSeedArtifact,
  redesignBrief: RedesignBriefArtifact,
  snapshotResult: SnapshotExecutionResult
): ScaffoldContactSection {
  const hasContactSignals = snapshotResult.pageAnalyses.some((analysis) => analysis.hasContact);
  const usesExternalFlow = redesignBrief.externalFlowHandling.mode !== "not-applicable";
  const primaryHref = usesExternalFlow && snapshotResult.primaryExternalFlowUrl
    ? snapshotResult.primaryExternalFlowUrl
    : "#contact";

  const points = [
    hasContactSignals
      ? "Carry verified contact cues forward when refining the draft."
      : "Contact details remain placeholder-safe until they are explicitly verified.",
    "No internal booking engine, admin panel, or hidden form logic is introduced here."
  ];

  if (usesExternalFlow && snapshotResult.primaryExternalFlowUrl) {
    points.push(`Primary CTA keeps the preserved external route: ${snapshotResult.primaryExternalFlowUrl}`);
  }

  return {
    heading: "Contact handling stays bounded and explicit.",
    body:
      redesignBrief.externalFlowHandling.mode === "not-applicable"
        ? `CTA bias: ${designSeed.copyProfile.ctaBias}.`
        : redesignBrief.externalFlowHandling.notes,
    points,
    primaryLabel: resolvePrimaryCtaLabel(redesignBrief, designSeed),
    primaryHref,
    secondaryLabel: "Review draft constraints",
    secondaryHref: "#hero"
  };
}

function buildScaffoldPackageJson(lead: LeadArtifact): Record<string, unknown> {
  return {
    name: `${slugify(lead.leadKey)}-draft-scaffold`,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start"
    },
    dependencies: {
      next: "15.5.7",
      react: "19.2.4",
      "react-dom": "19.2.4"
    },
    devDependencies: {
      "@types/node": "25.5.0",
      "@types/react": "19.2.2",
      "@types/react-dom": "19.2.2",
      typescript: "5.9.3"
    }
  };
}

function buildScaffoldTsconfig(): string {
  const tsconfig = {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: false,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      baseUrl: ".",
      paths: {
        "@/*": ["./*"]
      }
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"]
  };

  return `${JSON.stringify(tsconfig, null, 2)}\n`;
}

function buildNextEnvFile(): string {
  return `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is generated for the draft scaffold and should not be edited manually.
`;
}

function resolveHeroTitle(
  lead: LeadArtifact,
  qualification: QualificationArtifact,
  homeTitle: string | undefined
): string {
  const fromFinding = compactSentence(qualification.evidence?.homepageFinding ?? "");
  if (fromFinding && fromFinding.length <= 72 && !/(https?:\/\/|\|)/iu.test(fromFinding)) {
    return truncateHeadline(fromFinding);
  }

  const fromTitle = sanitizeHeadline(homeTitle, "");
  if (fromTitle) {
    return fromTitle;
  }

  return `A clearer front-door experience for ${lead.businessName}`;
}

function buildHeroBody(
  heroTitle: string,
  problemSummary: string,
  redesignGoals: string[]
): string {
  const summary = compactSentence(problemSummary);
  const compatibleSummary =
    summary && !summary.toLowerCase().includes(heroTitle.toLowerCase()) && !/(https?:\/\/)/iu.test(summary)
      ? summary
      : "";

  return compactSentence(
    [compatibleSummary, redesignGoals[0], redesignGoals[1]]
      .filter((value): value is string => Boolean(value && value.trim().length > 0))
      .join(" ")
  );
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

  const bias = designSeed.copyProfile.ctaBias.toLowerCase();
  if (bias.includes("contact")) {
    return "Contact the team";
  }
  if (bias.includes("consult")) {
    return "Request a consultation";
  }

  return "See the next step";
}

function humanizePageKey(pageKey: string, pageType: string): string {
  if (pageType === "key-service") {
    return pageKey === "key-service-1" ? "Key service page 1" : "Key service page 2";
  }
  if (pageType === "contact-booking") {
    return "Contact / booking surface";
  }
  if (pageType === "single-page") {
    return "Single-page layout";
  }

  return pageKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sanitizeHeadline(value: string | undefined, fallback: string): string {
  const normalized = compactSentence(value ?? "");
  const beforePipe = normalized.split("|")[0]?.trim() ?? "";
  const beforeDash = beforePipe.split(" - ")[0]?.trim() ?? beforePipe;
  const candidate = beforeDash || fallback;
  return truncateHeadline(candidate);
}

function truncateHeadline(value: string): string {
  return value.length > 78 ? `${value.slice(0, 75).trim()}...` : value;
}

function compactSentence(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}
