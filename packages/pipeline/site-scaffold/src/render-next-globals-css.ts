import type { DesignSeedArtifact } from "../../../shared/src/contracts";

export function renderNextGlobalsCss(designSeed: DesignSeedArtifact): string {
  const theme = resolveTheme(designSeed);
  const typography = resolveTypographyStacks(designSeed);
  const radius = 20 + Math.round(designSeed.tasteProfile.designVariance * 8);
  const spacing = designSeed.tasteProfile.visualDensity >= 7 ? "clamp(1.2rem, 2vw, 1.8rem)" : "clamp(1.5rem, 2.6vw, 2.4rem)";
  const containerWidth = designSeed.tasteProfile.visualDensity >= 7 ? "1180px" : "1080px";

  return `:root {
  --bg: ${theme.bg};
  --bg-alt: ${theme.bgAlt};
  --surface: ${theme.surface};
  --surface-strong: ${theme.surfaceStrong};
  --text: ${theme.text};
  --muted: ${theme.muted};
  --accent: ${theme.accent};
  --accent-contrast: ${theme.accentContrast};
  --line: ${theme.line};
  --shadow: ${theme.shadow};
  --glow: ${theme.glow};
  --radius: ${radius}px;
  --space: ${spacing};
  --container: ${containerWidth};
  --font-display: ${typography.display};
  --font-body: ${typography.body};
  --font-mono: ${typography.mono};
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, var(--glow) 0%, transparent 30%),
    linear-gradient(180deg, var(--bg) 0%, var(--bg-alt) 100%);
  color: var(--text);
  font: 400 16px/1.6 var(--font-body);
}

a {
  color: inherit;
  text-decoration: none;
}

.site-shell {
  padding: 24px 0 56px;
}

.site-frame {
  width: min(calc(100% - 32px), var(--container));
  margin: 0 auto;
  display: grid;
  gap: var(--space);
}

.draft-banner,
.section,
.hero-section,
.planned-pages {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: var(--shadow);
}

.draft-banner,
.section,
.planned-pages {
  padding: clamp(1.2rem, 2vw, 1.8rem);
}

.draft-banner {
  width: min(calc(100% - 32px), var(--container));
  margin: 0 auto var(--space);
  position: sticky;
  top: 12px;
  z-index: 20;
  backdrop-filter: blur(16px);
}

.draft-banner__eyebrow,
.section__eyebrow,
.hero-section__eyebrow,
.info-card__meta {
  display: inline-block;
  font: 700 12px/1.2 var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.draft-banner__grid,
.draft-banner__details {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-top: 16px;
}

.draft-banner strong,
.section strong,
.planned-pages strong {
  font-weight: 700;
}

.draft-banner p,
.draft-banner li,
.section p,
.section li,
.planned-pages p {
  color: var(--muted);
}

.draft-banner ul,
.stack-list {
  margin: 0;
  padding-left: 18px;
}

.hero-section {
  padding: clamp(1.8rem, 4vw, 3.25rem);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-strong) 80%, transparent), var(--surface)),
    linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.04));
}

.hero-section__copy {
  display: grid;
  gap: 18px;
  max-width: 70ch;
}

.hero-section h1,
.section h2 {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: -0.05em;
}

.hero-section h1 {
  font-size: clamp(2.8rem, 7vw, 5.6rem);
  line-height: 0.94;
  max-width: 12ch;
}

.section h2 {
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 0.98;
}

.hero-section p,
.section__header p {
  margin: 0;
  max-width: 68ch;
  color: var(--muted);
}

.hero-section__note {
  padding: 14px 16px;
  border-radius: calc(var(--radius) - 10px);
  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);
  border: 1px solid var(--line);
}

.hero-section__actions,
.section__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
  transition: transform 180ms ease, background 180ms ease;
}

.button:hover {
  transform: translateY(-1px);
}

.button--primary {
  background: var(--accent);
  color: var(--accent-contrast);
}

.button--secondary {
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  border-color: var(--line);
}

.section__header {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.card-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.info-card {
  display: grid;
  gap: 12px;
  min-height: 220px;
  padding: 18px;
  border-radius: calc(var(--radius) - 10px);
  border: 1px solid var(--line);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 74%, transparent), var(--surface));
}

.info-card h3 {
  margin: 0;
  font: 700 1.15rem/1.1 var(--font-display);
}

.info-card p {
  margin: 0;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  color: var(--muted);
  font: 600 13px/1.2 var(--font-mono);
}

@media (max-width: 720px) {
  .site-shell {
    padding-top: 12px;
  }

  .draft-banner,
  .hero-section,
  .section,
  .planned-pages {
    width: min(calc(100% - 20px), var(--container));
  }

  .hero-section,
  .section,
  .planned-pages {
    padding: 20px;
  }

  .hero-section__actions,
  .section__actions {
    flex-direction: column;
  }

  .button {
    width: 100%;
  }
}
`;
}

function resolveTheme(designSeed: DesignSeedArtifact): {
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  muted: string;
  accent: string;
  accentContrast: string;
  line: string;
  shadow: string;
  glow: string;
} {
  const haystack = [
    ...designSeed.paletteDirection,
    ...designSeed.visualDirection,
    ...designSeed.imageryDirection
  ]
    .join(" ")
    .toLowerCase();

  if (/(clinical|dental|clean|sterile|cool|medical)/u.test(haystack)) {
    return {
      bg: "#eef6fb",
      bgAlt: "#f8fcff",
      surface: "#ffffff",
      surfaceStrong: "#e6f4ff",
      text: "#143248",
      muted: "#587185",
      accent: "#1c7cc7",
      accentContrast: "#ffffff",
      line: "rgba(20, 50, 72, 0.12)",
      shadow: "0 20px 48px rgba(18, 58, 86, 0.08)",
      glow: "rgba(76, 148, 207, 0.18)"
    };
  }

  if (/(salon|beauty|organic|warm|luxury|editorial)/u.test(haystack)) {
    return {
      bg: "#f7efe7",
      bgAlt: "#fff9f3",
      surface: "#fffcf7",
      surfaceStrong: "#f4e5d8",
      text: "#34231b",
      muted: "#6c5547",
      accent: "#ab5b35",
      accentContrast: "#fffaf6",
      line: "rgba(52, 35, 27, 0.11)",
      shadow: "0 22px 46px rgba(97, 58, 36, 0.11)",
      glow: "rgba(184, 120, 83, 0.20)"
    };
  }

  return {
    bg: "#101821",
    bgAlt: "#172230",
    surface: "#152232",
    surfaceStrong: "#1d3047",
    text: "#edf4fb",
    muted: "#aec2d5",
    accent: "#7fd0ff",
    accentContrast: "#07263a",
    line: "rgba(237, 244, 251, 0.12)",
    shadow: "0 22px 46px rgba(0, 0, 0, 0.24)",
    glow: "rgba(90, 150, 220, 0.20)"
  };
}

function resolveTypographyStacks(designSeed: DesignSeedArtifact): {
  display: string;
  body: string;
  mono: string;
} {
  const haystack = [
    ...designSeed.typographyDirection,
    ...designSeed.visualDirection
  ]
    .join(" ")
    .toLowerCase();

  if (/(editorial|luxury|beauty|salon)/u.test(haystack)) {
    return {
      display: `"Outfit", "Avenir Next", "Segoe UI", sans-serif`,
      body: `"Instrument Sans", "Segoe UI", sans-serif`,
      mono: `"JetBrains Mono", "SFMono-Regular", monospace`
    };
  }

  if (/(clinical|legal|structured|sober|trust)/u.test(haystack)) {
    return {
      display: `"Satoshi", "Segoe UI", sans-serif`,
      body: `"Geist", "Segoe UI", sans-serif`,
      mono: `"Geist Mono", "SFMono-Regular", monospace`
    };
  }

  return {
    display: `"Cabinet Grotesk", "Avenir Next", "Segoe UI", sans-serif`,
    body: `"Geist", "Segoe UI", sans-serif`,
    mono: `"Geist Mono", "SFMono-Regular", monospace`
  };
}
