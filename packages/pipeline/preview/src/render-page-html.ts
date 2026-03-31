export interface PreviewServiceCard {
  title: string;
  body: string;
}

export interface PreviewDirectionCard {
  title: string;
  items: string[];
}

export interface PreviewRenderModel {
  businessName: string;
  pageTitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  plannedPages: string[];
  draftNotes: string[];
  assumptions: string[];
  serviceCards: PreviewServiceCard[];
  trustPoints: string[];
  contactPoints: string[];
  directionCards: PreviewDirectionCard[];
  externalFlowNote?: string;
}

export function renderPageHtml(model: PreviewRenderModel): string {
  const draftBanner =
    model.draftNotes.length > 0
      ? `
  <section class="banner">
    <div class="shell">
      <strong>Draft preview</strong>
      <ul>
        ${model.draftNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("\n        ")}
      </ul>
    </div>
  </section>`
      : "";

  const plannedPageChips =
    model.plannedPages.length > 0
      ? model.plannedPages.map((page) => `<span class="chip">${escapeHtml(page)}</span>`).join("")
      : `<span class="chip">Home</span>`;

  const assumptionList =
    model.assumptions.length > 0
      ? `<ul>${model.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>No extra assumptions were required for this draft.</p>";

  const serviceCards = model.serviceCards
    .map(
      (card) => `
        <article class="card">
          <strong>${escapeHtml(card.title)}</strong>
          <p>${escapeHtml(card.body)}</p>
        </article>`
    )
    .join("");

  const trustList = model.trustPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
  const contactList = model.contactPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
  const directionCards = model.directionCards
    .map(
      (card) => `
        <article class="card">
          <strong>${escapeHtml(card.title)}</strong>
          <ul>${card.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>`
    )
    .join("");

  const externalFlowCard = model.externalFlowNote
    ? `
      <article class="meta-card">
        <strong>External flow</strong>
        <p>${escapeHtml(model.externalFlowNote)}</p>
      </article>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(model.pageTitle)}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    ${draftBanner}
    <header class="topbar">
      <div class="shell topbar__row">
        <div class="brand">
          <span class="brand__eyebrow">Local preview bundle</span>
          <span class="brand__name">${escapeHtml(model.businessName)}</span>
        </div>
        <nav class="chips" aria-label="Planned scope">
          ${plannedPageChips}
        </nav>
      </div>
    </header>

    <main class="shell">
      <section class="hero">
        <div class="hero__panel">
          <span class="eyebrow">${escapeHtml(model.heroEyebrow)}</span>
          <h1>${escapeHtml(model.heroTitle)}</h1>
          <p>${escapeHtml(model.heroBody)}</p>
          <div class="hero__actions">
            <a class="button button--primary" href="${escapeAttribute(model.primaryCtaHref)}">${escapeHtml(model.primaryCtaLabel)}</a>
            <a class="button button--secondary" href="#scope">${escapeHtml(model.secondaryCtaLabel)}</a>
          </div>
        </div>

        <div class="hero__meta">
          <article class="meta-card">
            <strong>Planned scope</strong>
            <p>Homepage-only preview for the current slice. Additional pages stay scaffolded, not fully rendered.</p>
          </article>
          <article class="meta-card">
            <strong>Trust policy</strong>
            <p>No fabricated prices, staff, reviews, licenses, or guarantees. Gaps stay visible as placeholders or assumptions.</p>
          </article>
          ${externalFlowCard}
        </div>
      </section>

      <div class="content">
        <section class="section" id="services">
          <h2>Service direction</h2>
          <p class="section__intro">The service layer stays generic enough to remain truthful while still showing the intended information architecture.</p>
          <div class="cards">
            ${serviceCards}
          </div>
        </section>

        <section class="section" id="proof">
          <h2>Trust and proof</h2>
          <p class="section__intro">This draft keeps trust language conservative and avoids unsupported social proof.</p>
          <ul>${trustList}</ul>
        </section>

        <section class="section" id="contact">
          <h2>Contact and CTA</h2>
          <p class="section__intro">The conversion surface stays aligned with the approved boundary and preserved handoff rules.</p>
          <ul>${contactList}</ul>
        </section>

        <section class="section" id="scope">
          <h2>Direction snapshot</h2>
          <p class="section__intro">These direction cards come directly from the structured generation artifacts and do not add new policy decisions.</p>
          <div class="direction-grid">
            ${directionCards}
          </div>
        </section>
      </div>
    </main>

    <footer class="shell footer">
      <div class="footer-card">
        <strong>Draft notes</strong>
        ${assumptionList}
      </div>
    </footer>
  </body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
