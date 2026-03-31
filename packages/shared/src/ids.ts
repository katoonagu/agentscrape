import { randomUUID } from "node:crypto";

export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "item";
}

export function createId(prefix: string, seed?: string): string {
  const suffix = seed ? slugify(seed).slice(0, 48) : randomUUID().replace(/-/g, "");
  return `${prefix}_${suffix}`;
}

export function createRunId(requestId: string): string {
  const normalized = requestId.startsWith("run-request_")
    ? requestId.replace(/^run-request_/, "run_")
    : requestId.startsWith("run_")
      ? requestId
      : `run_${requestId}`;

  return slugify(normalized).replace(/-/g, "_");
}
