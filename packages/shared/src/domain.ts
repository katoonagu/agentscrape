import { getDomain } from "tldts";
import { slugify } from "./ids";

export interface NormalizedUrl {
  siteUrl: string;
  canonicalDomain: string;
  leadKey: string;
}

export function normalizeSiteUrl(rawValue: string): NormalizedUrl | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    const domain = getDomain(parsed.hostname);
    if (!domain) {
      return null;
    }

    parsed.hash = "";
    const canonicalDomain = domain.replace(/^www\./i, "").toLowerCase();

    return {
      siteUrl: parsed.toString(),
      canonicalDomain,
      leadKey: canonicalDomain
    };
  } catch {
    return null;
  }
}

export function fallbackLeadKey(label: string, usedKeys: Set<string>): string {
  const base = `${slugify(label).slice(0, 48) || "lead"}.example`;
  if (!usedKeys.has(base)) {
    usedKeys.add(base);
    return base;
  }

  let counter = 2;
  while (true) {
    const candidate = `${slugify(label).slice(0, 44) || "lead"}-${counter}.example`;
    if (!usedKeys.has(candidate)) {
      usedKeys.add(candidate);
      return candidate;
    }

    counter += 1;
  }
}

export function deriveBusinessName(rawBusinessName: string | undefined, fallbackDomain: string, index: number): string {
  const explicit = rawBusinessName?.trim();
  if (explicit) {
    return explicit;
  }

  const humanized = fallbackDomain
    .replace(/\.[a-z0-9-]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return humanized || `Lead ${index}`;
}
