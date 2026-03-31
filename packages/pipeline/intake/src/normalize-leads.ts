import { deriveBusinessName, fallbackLeadKey, normalizeSiteUrl } from "../../../shared/src/domain";
import { createId, slugify } from "../../../shared/src/ids";
import type { LeadArtifact } from "../../../shared/src/contracts";
import type { ManualInputRecord } from "./load-manual-input";

export interface NormalizedLeadRecord {
  lead: LeadArtifact;
  artifactFileName: string;
  shouldInspect: boolean;
}

export function normalizeLeads(records: ManualInputRecord[], importedAt: string): NormalizedLeadRecord[] {
  const normalized: NormalizedLeadRecord[] = [];
  const usedSyntheticKeys = new Set<string>();
  const canonicalLeadByKey = new Map<string, { leadKey: string; leadId: string; count: number }>();

  records.forEach((record, index) => {
    const normalizedSite = record.siteValue ? normalizeSiteUrl(record.siteValue) : null;
    const businessName = deriveBusinessName(
      record.businessName,
      normalizedSite?.canonicalDomain ?? record.siteValue ?? `lead-${index + 1}`,
      index + 1
    );

    if (!normalizedSite) {
      const leadKey = fallbackLeadKey(businessName, usedSyntheticKeys);
      const leadId = createId("lead", `${leadKey}-${index + 1}`);

      normalized.push({
        lead: {
          leadId,
          leadKey,
          businessName,
          canonicalDomain: leadKey,
          hasSite: false,
          source: {
            kind: "manual-list",
            sourceRef: record.sourceRef,
            importedAt,
            rawLabel: record.rawLabel
          },
          currentState: "DECISION_MADE",
          reasonCodes: ["NO_SITE"],
          notes: "No valid public site URL was provided during manual intake."
        },
        artifactFileName: `${slugify(leadKey)}.lead.json`,
        shouldInspect: false
      });

      return;
    }

    const leadId = createId("lead", `${normalizedSite.leadKey}-${index + 1}`);
    const existingCanonical = canonicalLeadByKey.get(normalizedSite.leadKey);

    if (existingCanonical) {
      existingCanonical.count += 1;

      normalized.push({
        lead: {
          leadId,
          leadKey: normalizedSite.leadKey,
          businessName,
          canonicalDomain: normalizedSite.canonicalDomain,
          siteUrl: normalizedSite.siteUrl,
          hasSite: true,
          subdomainDisposition: "PRIMARY_ENTITY",
          source: {
            kind: "manual-list",
            sourceRef: record.sourceRef,
            importedAt,
            rawLabel: record.rawLabel
          },
          currentState: "DECISION_MADE",
          reasonCodes: ["DUPLICATE_DOMAIN"],
          duplicateOfLeadKey: existingCanonical.leadKey,
          notes: `Duplicate of canonical lead ${existingCanonical.leadId}.`
        },
        artifactFileName: `${slugify(normalizedSite.leadKey)}--dup-${existingCanonical.count}.lead.json`,
        shouldInspect: false
      });

      return;
    }

    canonicalLeadByKey.set(normalizedSite.leadKey, {
      leadKey: normalizedSite.leadKey,
      leadId,
      count: 1
    });

    normalized.push({
      lead: {
        leadId,
        leadKey: normalizedSite.leadKey,
        businessName,
        canonicalDomain: normalizedSite.canonicalDomain,
        siteUrl: normalizedSite.siteUrl,
        hasSite: true,
        subdomainDisposition: "PRIMARY_ENTITY",
        source: {
          kind: "manual-list",
          sourceRef: record.sourceRef,
          importedAt,
          rawLabel: record.rawLabel
        },
        currentState: "NORMALIZED"
      },
      artifactFileName: `${slugify(normalizedSite.leadKey)}.lead.json`,
      shouldInspect: true
    });
  });

  return normalized;
}
