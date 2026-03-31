import type { DesignSeedArtifact } from "../../../shared/src/contracts";

export function renderPageCss(designSeed: DesignSeedArtifact): string {
  const theme = resolveTheme(designSeed);
  const radius = 18 + Math.round(designSeed.tasteProfile.designVariance * 8);
  const contentWidth = designSeed.tasteProfile.visualDensity >= 7 ? "1200px" : "1080px";

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
  --radius: ${radius}px;
  --content-width: ${contentWidth};
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  color: var(--text);
  background:
    radial-gradient(circle at top left, ${theme.bgGlow} 0%, transparent 34%),
    linear-gradient(180deg, var(--bg) 0%, var(--bg-alt) 100%);
  font: 400 16px/1.6 "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

a {
  color: inherit;
}

.shell {
  width: min(calc(100% - 32px), var(--content-width));
  margin: 0 auto;
}

.banner {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(14px);
  background: color-mix(in srgb, var(--surface-strong) 82%, transparent);
  border-bottom: 1px solid var(--line);
}

.banner .shell {
  display: grid;
  gap: 8px;
  padding: 14px 0;
}

.banner strong {
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.banner ul {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
}

.topbar {
  padding: 24px 0 0;
}

.topbar__row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: calc(var(--radius) - 6px);
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  box-shadow: var(--shadow);
}

.brand {
  display: grid;
  gap: 4px;
}

.brand__eyebrow {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.brand__name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--muted);
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  font-size: 13px;
}

.hero {
  display: grid;
  gap: 24px;
  padding: 52px 0 26px;
}

.hero__panel {
  display: grid;
  gap: 18px;
  padding: 34px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-strong) 80%, transparent), var(--surface)),
    linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.02));
  box-shadow: var(--shadow);
}

.eyebrow {
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 0;
  max-width: 12ch;
  font-size: clamp(42px, 8vw, 74px);
  line-height: 0.95;
  letter-spacing: -0.05em;
}

.hero p {
  margin: 0;
  max-width: 70ch;
  color: var(--muted);
  font-size: 18px;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  border-radius: 999px;
  border: 1px solid transparent;
  text-decoration: none;
  font-weight: 700;
}

.button--primary {
  background: var(--accent);
  color: var(--accent-contrast);
}

.button--secondary {
  border-color: var(--line);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
}

.hero__meta {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.meta-card,
.section,
.footer-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: var(--shadow);
}

.meta-card {
  padding: 18px;
}

.meta-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.meta-card p,
.meta-card ul {
  margin: 0;
  color: var(--muted);
}

.content {
  display: grid;
  gap: 22px;
  padding: 10px 0 48px;
}

.section {
  padding: 28px;
}

.section h2 {
  margin: 0 0 8px;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.section__intro {
  margin: 0 0 18px;
  max-width: 70ch;
  color: var(--muted);
}

.cards {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.card {
  min-height: 180px;
  padding: 18px;
  border-radius: calc(var(--radius) - 8px);
  border: 1px solid var(--line);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 75%, transparent), var(--surface));
}

.card strong {
  display: block;
  margin-bottom: 10px;
  font-size: 18px;
  line-height: 1.1;
}

.card p,
.section ul,
.section li {
  color: var(--muted);
}

.section ul {
  margin: 0;
  padding-left: 18px;
}

.direction-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.direction-grid .card {
  min-height: auto;
}

.footer {
  padding: 0 0 48px;
}

.footer-card {
  padding: 22px 24px 26px;
}

.footer-card p {
  margin: 8px 0 0;
  color: var(--muted);
}

@media (max-width: 720px) {
  .topbar__row {
    align-items: flex-start;
    flex-direction: column;
  }

  .chips {
    justify-content: flex-start;
  }

  .hero__panel,
  .section,
  .footer-card {
    padding: 22px;
  }
}
`;
}

function resolveTheme(designSeed: DesignSeedArtifact): {
  bg: string;
  bgAlt: string;
  bgGlow: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  muted: string;
  accent: string;
  accentContrast: string;
  line: string;
  shadow: string;
} {
  const haystack = [
    ...designSeed.paletteDirection,
    ...designSeed.visualDirection,
    ...designSeed.imageryDirection
  ]
    .join(" ")
    .toLowerCase();

  if (/(clinical|clean|white|cool|dental)/u.test(haystack)) {
    return {
      bg: "#eef6fb",
      bgAlt: "#f9fcff",
      bgGlow: "rgba(68, 148, 207, 0.18)",
      surface: "#ffffff",
      surfaceStrong: "#e8f4fd",
      text: "#133247",
      muted: "#4f6b7d",
      accent: "#1779c6",
      accentContrast: "#ffffff",
      line: "rgba(19, 50, 71, 0.12)",
      shadow: "0 18px 40px rgba(25, 73, 107, 0.08)"
    };
  }

  if (/(warm|editorial|salon|beauty|organic|luxury)/u.test(haystack)) {
    return {
      bg: "#f7efe7",
      bgAlt: "#fff9f3",
      bgGlow: "rgba(183, 119, 84, 0.20)",
      surface: "#fffdf9",
      surfaceStrong: "#f6e7dc",
      text: "#33221b",
      muted: "#6a5348",
      accent: "#a95834",
      accentContrast: "#fffaf6",
      line: "rgba(51, 34, 27, 0.10)",
      shadow: "0 18px 42px rgba(89, 51, 30, 0.10)"
    };
  }

  return {
    bg: "#0d1520",
    bgAlt: "#141f2d",
    bgGlow: "rgba(83, 144, 216, 0.20)",
    surface: "#132031",
    surfaceStrong: "#1a2d43",
    text: "#edf4fb",
    muted: "#a9bfd4",
    accent: "#7cd3ff",
    accentContrast: "#04263b",
    line: "rgba(237, 244, 251, 0.12)",
    shadow: "0 18px 40px rgba(0, 0, 0, 0.22)"
  };
}
