import type { Source, Evidence } from "@/lib/research";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import { CompanyProfileSchema } from "@/lib/competitors/schemas/company.schema";
import { buildRefreshMetadata } from "@/lib/competitors/refresh/refreshPolicy";
import { urlDedupeKey } from "@/lib/competitors/utils/urlNormalization";
import { parseOrThrow } from "@/lib/validation/parse";

function dedupeByUrl<TItem extends { url: string }>(items: TItem[]): TItem[] {
  const seen = new Set<string>();
  const deduped: TItem[] = [];

  for (const item of items) {
    const key = urlDedupeKey(item.url);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function mergeStringLists(existing: string[], incoming: string[]): string[] {
  return Array.from(new Set([...existing, ...incoming]));
}

export interface MergeCompanyProfileInput {
  aliases?: string[];
  website?: string;
  description?: string;
  targetMarket?: string;
  businessModel?: string;
  features?: string[];
  technology?: string[];
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  threats?: string[];
  sources?: Source[];
  evidence?: Evidence[];
  confidence: number;
}

// The core operation behind "this platform must accumulate knowledge over
// time" (this milestone's stated goal): given an already-known
// CompanyProfile and freshly discovered data about the same company, folds
// the new data in rather than replacing the profile outright. List fields
// (aliases/features/strengths/...) union; sources/evidence union by URL so
// re-researching a company doesn't pile up duplicate citations of the same
// page; `confidence` takes the incoming value (a newer read is assumed
// more current, per the refresh engine's whole premise) and drives the
// next refresh schedule via refreshPolicy, reason "scheduled" — the caller
// (refresh engine / discovery) is responsible for overriding `refresh`
// afterward if this merge was actually triggered by a manual/stale reason.
export function mergeCompanyProfile(
  existing: CompanyProfile,
  incoming: MergeCompanyProfileInput,
  now: Date = new Date()
): CompanyProfile {
  return parseOrThrow(
    CompanyProfileSchema,
    {
      ...existing,
      aliases: mergeStringLists(existing.aliases, incoming.aliases ?? []),
      website: incoming.website ?? existing.website,
      description: incoming.description ?? existing.description,
      targetMarket: incoming.targetMarket ?? existing.targetMarket,
      businessModel: incoming.businessModel ?? existing.businessModel,
      features: mergeStringLists(existing.features, incoming.features ?? []),
      technology: mergeStringLists(existing.technology, incoming.technology ?? []),
      strengths: mergeStringLists(existing.strengths, incoming.strengths ?? []),
      weaknesses: mergeStringLists(existing.weaknesses, incoming.weaknesses ?? []),
      opportunities: mergeStringLists(existing.opportunities, incoming.opportunities ?? []),
      threats: mergeStringLists(existing.threats, incoming.threats ?? []),
      sources: dedupeByUrl([...existing.sources, ...(incoming.sources ?? [])]),
      evidence: dedupeByUrl([...existing.evidence, ...(incoming.evidence ?? [])]),
      confidence: incoming.confidence,
      refresh: buildRefreshMetadata("scheduled", incoming.confidence, now),
    },
    "Failed to build a schema-valid merged CompanyProfile."
  );
}
