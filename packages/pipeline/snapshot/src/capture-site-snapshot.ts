import path from "node:path";
import type { Browser, Page } from "playwright";
import type {
  AccessBarrier,
  ExternalFlow,
  LeadArtifact,
  SelectionMode,
  SiteSnapshotArtifact,
  SnapshotSlot
} from "../../../shared/src/contracts";

const PRIMARY_PAGE_TIMEOUT_MS = 20_000;
const SECONDARY_PAGE_TIMEOUT_MS = 12_000;
const LINK_KEYWORDS = [
  "services",
  "service",
  "pricing",
  "prices",
  "contact",
  "contacts",
  "booking",
  "book",
  "appointment",
  "услуги",
  "цены",
  "прайс",
  "контакты",
  "запись"
];

export interface PageAnalysis {
  slot: SnapshotSlot;
  requestedUrl: string;
  finalUrl: string;
  title: string;
  textLength: number;
  textSample: string;
  hasCta: boolean;
  hasContact: boolean;
  hasPricingSignals: boolean;
  hasServiceSignals: boolean;
  hasExternalBookingSignals: boolean;
  appHintCount: number;
  screenshotRef: string;
}

export interface SnapshotExecutionResult {
  artifact: SiteSnapshotArtifact;
  pageAnalyses: PageAnalysis[];
  barrierEncountered: boolean;
  retryAttempted: boolean;
  retrySucceeded: boolean;
  technicalNotes: string[];
}

interface DomLinkCandidate {
  href: string;
  text: string;
}

interface RawPageData {
  title: string;
  bodyText: string;
  links: DomLinkCandidate[];
  ctaTexts: string[];
  telLinkCount: number;
  emailLinkCount: number;
  formCount: number;
}

interface PageLoadResult {
  barrier: AccessBarrier;
  finalUrl: string;
  title: string;
  rawData: RawPageData;
  retryAttemptCount: number;
  retrySucceeded: boolean;
  technicalNotes: string[];
}

export async function captureSiteSnapshot(params: {
  browser: Browser;
  lead: LeadArtifact;
  screenshotsRoot: string;
  maxPages: number;
}): Promise<SnapshotExecutionResult> {
  const { browser, lead, screenshotsRoot } = params;

  if (!lead.siteUrl) {
    throw new Error(`Lead ${lead.leadKey} does not have a siteUrl.`);
  }

  const maxPages = Math.max(1, Math.min(params.maxPages, 3));
  const page = await browser.newPage();
  const pageAnalyses: PageAnalysis[] = [];
  const technicalNotes: string[] = [];

  try {
    const homeLoad = await loadHomePage(page, lead.siteUrl);
    technicalNotes.push(...homeLoad.technicalNotes);

    const homeScreenshotPath = path.join(screenshotsRoot, "home.png");
    await safeScreenshot(page, homeScreenshotPath);
    const homeScreenshotRef = toScreenshotRef(screenshotsRoot, homeScreenshotPath);

    const homeAnalysis = toPageAnalysis("HOME", lead.siteUrl, homeLoad.finalUrl, homeLoad.title, homeLoad.rawData, homeScreenshotRef);
    pageAnalyses.push(homeAnalysis);

    const onePageCandidate = selectSelectionMode(homeAnalysis) === "ONE_PAGE_VIRTUAL_SECTIONS";
    const selectedLinks =
      homeLoad.barrier === "NONE"
        ? rankInternalLinks(homeLoad.rawData.links, homeLoad.finalUrl).slice(0, Math.max(0, maxPages - 1))
        : [];

    for (let index = 0; index < selectedLinks.length; index += 1) {
      const slot: SnapshotSlot = index === 0 ? "KEY_SERVICE_1" : "KEY_SERVICE_2";
      const secondaryPage = await browser.newPage();
      try {
        const loadResult = await loadSecondaryPage(secondaryPage, selectedLinks[index].href);
        technicalNotes.push(...loadResult.technicalNotes);
        if (loadResult.barrier !== "NONE") {
          technicalNotes.push(`Skipped ${selectedLinks[index].href} because it resolved to ${loadResult.barrier}.`);
          continue;
        }

        const screenshotPath = path.join(
          screenshotsRoot,
          index === 0 ? "key-service-1.png" : "key-service-2.png"
        );
        await safeScreenshot(secondaryPage, screenshotPath);
        const screenshotRef = toScreenshotRef(screenshotsRoot, screenshotPath);
        pageAnalyses.push(
          toPageAnalysis(
            slot,
            selectedLinks[index].href,
            loadResult.finalUrl,
            loadResult.title,
            loadResult.rawData,
            screenshotRef
          )
        );
      } finally {
        await secondaryPage.close();
      }
    }

    const externalFlow = pageAnalyses.some((analysis) => analysis.hasExternalBookingSignals)
      ? "EXTERNAL_BOOKING_OR_WIDGET"
      : "NONE";
    const finalSelectionMode =
      selectedLinks.length === 0 && onePageCandidate ? "ONE_PAGE_VIRTUAL_SECTIONS" : "STANDARD_3_PAGE";

    return {
      artifact: {
        snapshotId: `snapshot_${lead.leadKey}`,
        leadKey: lead.leadKey,
        siteUrl: homeLoad.finalUrl || lead.siteUrl,
        capturedAt: new Date().toISOString(),
        selectionMode: finalSelectionMode,
        entries: buildEntries(finalSelectionMode, pageAnalyses, homeAnalysis),
        accessBarrier: homeLoad.barrier,
        retryAttemptCount: homeLoad.retryAttemptCount,
        externalFlow,
        accessNotes: buildAccessNotes(homeLoad, technicalNotes, pageAnalyses.length)
      },
      pageAnalyses,
      barrierEncountered: homeLoad.barrier !== "NONE",
      retryAttempted: homeLoad.retryAttemptCount > 0,
      retrySucceeded: homeLoad.retrySucceeded,
      technicalNotes
    };
  } finally {
    await page.close();
  }
}

async function loadHomePage(page: Page, targetUrl: string): Promise<PageLoadResult> {
  const technicalNotes: string[] = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: PRIMARY_PAGE_TIMEOUT_MS });
      await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => undefined);
      const rawData = await extractPageData(page);
      const barrier = classifyBarrier(rawData.title, rawData.bodyText, page.url());

      if (barrier === "NONE") {
        return {
          barrier,
          finalUrl: page.url(),
          title: rawData.title,
          rawData,
          retryAttemptCount: attempt,
          retrySucceeded: attempt > 0,
          technicalNotes
        };
      }

      technicalNotes.push(`Homepage resolved to ${barrier} on attempt ${attempt + 1}.`);
      if (attempt === 0) {
        continue;
      }

      return {
        barrier,
        finalUrl: page.url() || targetUrl,
        title: rawData.title,
        rawData,
        retryAttemptCount: 1,
        retrySucceeded: false,
        technicalNotes
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      technicalNotes.push(`Homepage navigation failed on attempt ${attempt + 1}: ${message}`);
      if (attempt === 0) {
        continue;
      }

      return {
        barrier: classifyErrorBarrier(message),
        finalUrl: targetUrl,
        title: "Navigation failed",
        rawData: {
          title: "Navigation failed",
          bodyText: "",
          links: [],
          ctaTexts: [],
          telLinkCount: 0,
          emailLinkCount: 0,
          formCount: 0
        },
        retryAttemptCount: 1,
        retrySucceeded: false,
        technicalNotes
      };
    }
  }

  return {
    barrier: "CHALLENGE",
    finalUrl: targetUrl,
    title: "Navigation failed",
    rawData: {
      title: "Navigation failed",
      bodyText: "",
      links: [],
      ctaTexts: [],
      telLinkCount: 0,
      emailLinkCount: 0,
      formCount: 0
    },
    retryAttemptCount: 1,
    retrySucceeded: false,
    technicalNotes
  };
}

async function loadSecondaryPage(page: Page, targetUrl: string): Promise<PageLoadResult> {
  const technicalNotes: string[] = [];

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: SECONDARY_PAGE_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => undefined);
    const rawData = await extractPageData(page);
    return {
      barrier: classifyBarrier(rawData.title, rawData.bodyText, page.url()),
      finalUrl: page.url(),
      title: rawData.title,
      rawData,
      retryAttemptCount: 0,
      retrySucceeded: true,
      technicalNotes
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    technicalNotes.push(`Secondary page navigation failed for ${targetUrl}: ${message}`);

    return {
      barrier: classifyErrorBarrier(message),
      finalUrl: targetUrl,
      title: "Navigation failed",
      rawData: {
        title: "Navigation failed",
        bodyText: "",
        links: [],
        ctaTexts: [],
        telLinkCount: 0,
        emailLinkCount: 0,
        formCount: 0
      },
      retryAttemptCount: 0,
      retrySucceeded: false,
      technicalNotes
    };
  }
}

async function extractPageData(page: Page): Promise<RawPageData> {
  return page.evaluate(() => {
    const linkElements = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).slice(0, 250);
    const ctaElements = Array.from(document.querySelectorAll<HTMLElement>("a, button, input[type='submit']")).slice(0, 120);
    const bodyText = document.body?.innerText ?? "";

    return {
      title: document.title ?? "",
      bodyText,
      links: linkElements.map((element) => ({
        href: element.href,
        text: (element.textContent ?? "").trim()
      })),
      ctaTexts: ctaElements.map((element) => {
        if (element instanceof HTMLInputElement) {
          return (element.value ?? "").trim();
        }

        return (element.textContent ?? "").trim();
      }),
      telLinkCount: document.querySelectorAll("a[href^='tel:']").length,
      emailLinkCount: document.querySelectorAll("a[href^='mailto:']").length,
      formCount: document.querySelectorAll("form").length
    };
  });
}

function toPageAnalysis(
  slot: SnapshotSlot,
  requestedUrl: string,
  finalUrl: string,
  title: string,
  rawData: RawPageData,
  screenshotRef: string
): PageAnalysis {
  const loweredText = `${title}\n${rawData.bodyText}`.toLowerCase();
  const ctaText = rawData.ctaTexts.join(" ").toLowerCase();

  return {
    slot,
    requestedUrl,
    finalUrl,
    title,
    textLength: rawData.bodyText.length,
    textSample: rawData.bodyText.slice(0, 1_000),
    hasCta: /(book|booking|call|contact|get started|schedule|appoint|запис|связат|позвон)/iu.test(ctaText),
    hasContact:
      rawData.telLinkCount > 0 ||
      rawData.emailLinkCount > 0 ||
      /(contact|phone|email|address|контакт|телефон|почт|адрес)/iu.test(loweredText),
    hasPricingSignals: /(pricing|prices|price|цены|прайс|стоимость)/iu.test(loweredText),
    hasServiceSignals: /(services|service|treatment|care|услуг|сервис|процедур)/iu.test(loweredText),
    hasExternalBookingSignals:
      /(calendly|booksy|acuityscheduling|widget|booking|appoint|reserve|yclients)/iu.test(loweredText) ||
      rawData.links.some((link) =>
        /(book|booking|appoint|reserve|запис)/iu.test(`${link.text} ${link.href}`) && !sameOrigin(finalUrl, link.href)
      ),
    screenshotRef,
    appHintCount: countMatches(
      loweredText,
      /(login|sign in|account|dashboard|portal|checkout|cart|register|кабинет|войти|корзин|оформить заказ)/giu
    ) + rawData.formCount
  };
}

function selectSelectionMode(homeAnalysis: PageAnalysis): SelectionMode {
  const onePageSignals =
    homeAnalysis.hasServiceSignals &&
    (homeAnalysis.hasContact || homeAnalysis.hasCta || homeAnalysis.hasPricingSignals);

  return onePageSignals ? "ONE_PAGE_VIRTUAL_SECTIONS" : "STANDARD_3_PAGE";
}

function buildEntries(
  selectionMode: SelectionMode,
  pageAnalyses: PageAnalysis[],
  homeAnalysis: PageAnalysis
): SiteSnapshotArtifact["entries"] {
  if (selectionMode === "ONE_PAGE_VIRTUAL_SECTIONS") {
    return [
      {
        slot: "HERO",
        kind: "virtual-section",
        label: "Hero section",
        sectionId: "hero",
        notes: `Homepage title: ${homeAnalysis.title || "untitled"}`
      },
      {
        slot: "SERVICE_SECTION",
        kind: "virtual-section",
        label: "Service section",
        sectionId: "services",
        notes: homeAnalysis.hasServiceSignals ? "Service-related copy detected on homepage." : "Heuristic section fallback."
      },
      {
        slot: "CONTACT_BOOKING_SECTION",
        kind: "virtual-section",
        label: "Contact or booking section",
        sectionId: "contact-booking",
        notes: homeAnalysis.hasContact ? "Contact signals detected on homepage." : "Booking/contact CTA inferred from homepage."
      }
    ];
  }

  return pageAnalyses.map((analysis) => ({
    slot: analysis.slot,
    kind: "url" as const,
    label: analysis.title || analysis.slot,
    url: analysis.finalUrl,
    notes: `Screenshot: ${analysis.screenshotRef}`
  }));
}

function buildAccessNotes(loadResult: PageLoadResult, technicalNotes: string[], pageCount: number): string | undefined {
  const parts = [`Homepage title: ${loadResult.title || "untitled"}`, `Captured views: ${pageCount}`];
  parts.push(...technicalNotes);
  return parts.filter(Boolean).join(" | ");
}

function classifyBarrier(title: string, bodyText: string, finalUrl: string): AccessBarrier {
  const combined = `${title}\n${bodyText}\n${finalUrl}`.toLowerCase();

  if (/(cloudflare|captcha|verify you are human|checking your browser|attention required|access denied)/iu.test(combined)) {
    return "ANTI_BOT";
  }

  if (/(not available in your region|your region|your country|geo|geoblock|регион|стране|country)/iu.test(combined)) {
    return "GEO";
  }

  if (/(sign in|log in|login required|member area|private area|войти|личный кабинет)/iu.test(combined)) {
    return "CHALLENGE";
  }

  return "NONE";
}

function classifyErrorBarrier(message: string): AccessBarrier {
  const normalized = message.toLowerCase();
  if (/(region|country|geo)/iu.test(normalized)) {
    return "GEO";
  }

  if (/(captcha|cloudflare|challenge|access denied)/iu.test(normalized)) {
    return "ANTI_BOT";
  }

  return "CHALLENGE";
}

function rankInternalLinks(links: DomLinkCandidate[], currentUrl: string): DomLinkCandidate[] {
  const currentOrigin = new URL(currentUrl).origin;
  const ranked = links
    .map((link) => ({
      ...link,
      score: scoreLink(link, currentOrigin)
    }))
    .filter((link) => link.score > 0)
    .sort((left, right) => right.score - left.score);

  const seen = new Set<string>();
  const result: DomLinkCandidate[] = [];

  for (const candidate of ranked) {
    try {
      const parsed = new URL(candidate.href);
      const dedupeKey = `${parsed.origin}${parsed.pathname.replace(/\/+$/u, "")}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      result.push({ href: parsed.toString(), text: candidate.text });
    } catch {
      continue;
    }
  }

  return result;
}

function scoreLink(link: DomLinkCandidate, currentOrigin: string): number {
  try {
    const parsed = new URL(link.href);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return -10;
    }

    if (parsed.origin !== currentOrigin) {
      return -10;
    }

    const haystack = `${parsed.pathname} ${link.text}`.toLowerCase();
    if (/(privacy|policy|terms|blog|article|post|cookies?)/iu.test(haystack)) {
      return -5;
    }

    let score = 0;
    for (const keyword of LINK_KEYWORDS) {
      if (haystack.includes(keyword)) {
        score += 5;
      }
    }

    if (parsed.pathname === "/" || parsed.pathname === "") {
      score -= 5;
    }

    return score;
  } catch {
    return -10;
  }
}

async function safeScreenshot(page: Page, screenshotPath: string): Promise<void> {
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
}

function toScreenshotRef(rootDir: string, screenshotPath: string): string {
  return path.relative(path.dirname(rootDir), screenshotPath).split(path.sep).join("/");
}

function sameOrigin(baseUrl: string, candidateUrl: string): boolean {
  try {
    return new URL(baseUrl).origin === new URL(candidateUrl).origin;
  } catch {
    return false;
  }
}

function countMatches(value: string, regex: RegExp): number {
  const matches = value.match(regex);
  return matches ? matches.length : 0;
}
