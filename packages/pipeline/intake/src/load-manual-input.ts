import path from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import { pathExists, readJsonFile, readTextFile } from "../../../shared/src/fs";
import type { Reference } from "../../../shared/src/contracts";

export interface ManualInputRecord {
  businessName?: string;
  siteValue?: string;
  sourceRef: string;
  rawLabel: string;
  ordinal: number;
}

interface JsonInputObject {
  businessName?: unknown;
  siteUrl?: unknown;
  url?: unknown;
  domain?: unknown;
  website?: unknown;
  name?: unknown;
}

const BUSINESS_NAME_HEADERS = ["businessname", "business_name", "name", "business"];
const SITE_HEADERS = ["siteurl", "site_url", "url", "website", "domain"];

export async function loadManualInputRecords(
  repoRoot: string,
  requestPath: string,
  inputRefs: Reference[]
): Promise<{ records: ManualInputRecord[]; sourceRefs: string[] }> {
  const records: ManualInputRecord[] = [];
  const sourceRefs: string[] = [];

  for (const reference of inputRefs) {
    if (reference.kind !== "source-file") {
      throw new Error(`Unsupported inputRef kind "${reference.kind}". Only "source-file" is implemented in this slice.`);
    }

    const resolvedPath = await resolveInputRefPath(repoRoot, requestPath, reference.ref);
    sourceRefs.push(path.relative(repoRoot, resolvedPath).split(path.sep).join("/"));
    const extension = path.extname(resolvedPath).toLowerCase();

    if (extension === ".csv") {
      records.push(...(await loadCsvRecords(resolvedPath, repoRoot)));
      continue;
    }

    if (extension === ".json") {
      records.push(...(await loadJsonRecords(resolvedPath, repoRoot)));
      continue;
    }

    if (extension === ".txt") {
      records.push(...(await loadTextRecords(resolvedPath, repoRoot)));
      continue;
    }

    throw new Error(`Unsupported input file extension "${extension}" for ${reference.ref}.`);
  }

  return { records, sourceRefs };
}

async function resolveInputRefPath(repoRoot: string, requestPath: string, ref: string): Promise<string> {
  const requestDir = path.dirname(requestPath);
  const candidates = [
    path.resolve(requestDir, ref),
    path.resolve(repoRoot, ref)
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Input file not found for ref "${ref}". Checked request-relative and repo-relative paths.`);
}

async function loadCsvRecords(filePath: string, repoRoot: string): Promise<ManualInputRecord[]> {
  const content = await readTextFile(filePath);
  const rows = parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[];

  return rows.map((row, index) => {
    const normalizedRow = normalizeCsvHeaders(row);
    const businessName = pickFirst(normalizedRow, BUSINESS_NAME_HEADERS);
    const siteValue = pickFirst(normalizedRow, SITE_HEADERS);

    return {
      businessName,
      siteValue,
      sourceRef: `${path.relative(repoRoot, filePath).split(path.sep).join("/")}#row-${index + 2}`,
      rawLabel: [businessName, siteValue].filter(Boolean).join(" | ") || `row-${index + 2}`,
      ordinal: index + 1
    };
  });
}

async function loadJsonRecords(filePath: string, repoRoot: string): Promise<ManualInputRecord[]> {
  const value = await readJsonFile<unknown>(filePath);
  if (!Array.isArray(value)) {
    throw new Error(`JSON input ${filePath} must contain an array.`);
  }

  return value.map((item, index) => {
    if (typeof item === "string") {
      return {
        businessName: undefined,
        siteValue: item,
        sourceRef: `${path.relative(repoRoot, filePath).split(path.sep).join("/")}#item-${index + 1}`,
        rawLabel: item,
        ordinal: index + 1
      };
    }

    if (isJsonInputObject(item)) {
      const businessName = getString(item.businessName) ?? getString(item.name);
      const siteValue =
        getString(item.siteUrl) ?? getString(item.url) ?? getString(item.domain) ?? getString(item.website);

      return {
        businessName,
        siteValue,
        sourceRef: `${path.relative(repoRoot, filePath).split(path.sep).join("/")}#item-${index + 1}`,
        rawLabel: [businessName, siteValue].filter(Boolean).join(" | ") || `item-${index + 1}`,
        ordinal: index + 1
      };
    }

    throw new Error(`JSON input ${filePath} contains unsupported item type at index ${index}.`);
  });
}

async function loadTextRecords(filePath: string, repoRoot: string): Promise<ManualInputRecord[]> {
  const content = await readTextFile(filePath);
  const lines = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return lines.map((line, index) => ({
    businessName: undefined,
    siteValue: line,
    sourceRef: `${path.relative(repoRoot, filePath).split(path.sep).join("/")}#line-${index + 1}`,
    rawLabel: line,
    ordinal: index + 1
  }));
}

function normalizeCsvHeaders(row: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z]/g, ""), value]));
}

function pickFirst(row: Record<string, string>, candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const value = row[candidate];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isJsonInputObject(value: unknown): value is JsonInputObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
