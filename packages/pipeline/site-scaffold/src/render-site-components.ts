export interface RenderedScaffoldComponents {
  typeDefinitions: string;
  draftBanner: string;
  heroSection: string;
  servicesSection: string;
  trustSection: string;
  contactSection: string;
  plannedPagesNav: string;
}

export function renderSiteComponents(): RenderedScaffoldComponents {
  return {
    typeDefinitions: renderTypesFile(),
    draftBanner: renderDraftBannerComponent(),
    heroSection: renderHeroSectionComponent(),
    servicesSection: renderServicesSectionComponent(),
    trustSection: renderTrustSectionComponent(),
    contactSection: renderContactSectionComponent(),
    plannedPagesNav: renderPlannedPagesNavComponent()
  };
}

function renderTypesFile(): string {
  return `export type ScaffoldSectionId = "hero" | "planned-pages" | "services" | "trust" | "contact";

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

export interface SiteContentModel {
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
`;
}

function renderDraftBannerComponent(): string {
  return `import type { SiteContentModel } from "./types";

export function DraftBanner({ draft }: { draft: SiteContentModel["draft"] }) {
  return (
    <section className="draft-banner" aria-label="Draft banner">
      <div className="draft-banner__eyebrow">Draft front-only scaffold</div>
      <div className="draft-banner__grid">
        <div>
          <strong>Status</strong>
          <p>
            {draft.approvalRequired ? "Approval still required." : "Operator approval is not required for this draft."}{" "}
            {draft.generationReady ? "The generation plan is structurally ready." : "The generation plan still carries readiness caveats."}
          </p>
        </div>
        <div>
          <strong>Notes</strong>
          <ul>
            {draft.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
      {(draft.assumptions.length > 0 || draft.placeholderSummaries.length > 0) ? (
        <div className="draft-banner__details">
          {draft.assumptions.length > 0 ? (
            <div>
              <strong>Assumptions</strong>
              <ul>
                {draft.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {draft.placeholderSummaries.length > 0 ? (
            <div>
              <strong>Placeholders</strong>
              <ul>
                {draft.placeholderSummaries.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
`;
}

function renderHeroSectionComponent(): string {
  return `import type { ScaffoldHero } from "./types";

function isExternalHref(href: string): boolean {
  return /^https?:\\/\\//u.test(href);
}

export function HeroSection({ hero }: { hero: ScaffoldHero }) {
  return (
    <section className="hero-section" id="hero">
      <div className="hero-section__copy">
        <span className="hero-section__eyebrow">{hero.eyebrow}</span>
        <h1>{hero.title}</h1>
        <p>{hero.body}</p>
        {hero.note ? <p className="hero-section__note">{hero.note}</p> : null}
        <div className="hero-section__actions">
          <a
            className="button button--primary"
            href={hero.primaryCtaHref}
            {...(isExternalHref(hero.primaryCtaHref) ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {hero.primaryCtaLabel}
          </a>
          <a className="button button--secondary" href={hero.secondaryCtaHref}>
            {hero.secondaryCtaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
`;
}

function renderServicesSectionComponent(): string {
  return `import type { ScaffoldServiceCard } from "./types";

export function ServicesSection({ cards }: { cards: ScaffoldServiceCard[] }) {
  return (
    <section className="section" id="services">
      <div className="section__header">
        <span className="section__eyebrow">Services</span>
        <h2>Clear offer framing without invented detail.</h2>
        <p>
          These cards stay tied to verified site clues when possible. Thin source material remains visibly draft-safe.
        </p>
      </div>
      <div className="card-grid">
        {cards.map((card) => (
          <article className="info-card" key={card.title}>
            <div className="info-card__meta">{card.status === "verified" ? "Verified cue" : "Draft-safe placeholder"}</div>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
`;
}

function renderTrustSectionComponent(): string {
  return `import type { ScaffoldTrustSection } from "./types";

export function TrustSection({ trust }: { trust: ScaffoldTrustSection }) {
  return (
    <section className="section" id="trust">
      <div className="section__header">
        <span className="section__eyebrow">Trust</span>
        <h2>{trust.heading}</h2>
        <p>{trust.body}</p>
      </div>
      <ul className="stack-list">
        {trust.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}
`;
}

function renderContactSectionComponent(): string {
  return `import type { ScaffoldContactSection } from "./types";

function isExternalHref(href: string): boolean {
  return /^https?:\\/\\//u.test(href);
}

export function ContactSection({ contact }: { contact: ScaffoldContactSection }) {
  return (
    <section className="section" id="contact">
      <div className="section__header">
        <span className="section__eyebrow">Contact</span>
        <h2>{contact.heading}</h2>
        <p>{contact.body}</p>
      </div>
      <ul className="stack-list">
        {contact.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <div className="section__actions">
        <a
          className="button button--primary"
          href={contact.primaryHref}
          {...(isExternalHref(contact.primaryHref) ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {contact.primaryLabel}
        </a>
        <a className="button button--secondary" href={contact.secondaryHref}>
          {contact.secondaryLabel}
        </a>
      </div>
    </section>
  );
}
`;
}

function renderPlannedPagesNavComponent(): string {
  return `import type { ScaffoldPlannedPage } from "./types";

export function PlannedPagesNav({ plannedPages }: { plannedPages: ScaffoldPlannedPage[] }) {
  if (plannedPages.length <= 1) {
    return null;
  }

  const secondaryPages = plannedPages.filter((page) => page.pageKey !== "home" && page.pageKey !== "single-page");
  if (secondaryPages.length === 0) {
    return null;
  }

  return (
    <section className="planned-pages" id="planned-scope">
      <div className="section__header">
        <span className="section__eyebrow">Planned pages</span>
        <h2>Homepage-only scaffold, with bounded future page intent.</h2>
        <p>
          This slice renders only the homepage. The items below stay informational so the scaffold does not become a
          multipage engine by implication.
        </p>
      </div>
      <div className="chip-row">
        {secondaryPages.map((page) => (
          <span className="chip" key={page.pageKey}>
            {page.label}
            {page.required ? " / required" : ""}
          </span>
        ))}
      </div>
    </section>
  );
}
`;
}
