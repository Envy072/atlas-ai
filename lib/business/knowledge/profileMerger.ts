import type { Source, Evidence } from "@/lib/research";
import type { CustomerSegment } from "@/lib/market";
import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import { BusinessProfileSchema } from "@/lib/business/schemas/business.schema";
import type { Dependency } from "@/lib/business/schemas/execution.schema";
import type { OperationalRisk } from "@/lib/business/schemas/risk.schema";
import { buildBusinessRefreshMetadata } from "@/lib/business/refresh/businessRefreshPolicy";
import { dedupeByKey } from "@/lib/business/utils/dedupeByKey";
import { urlDedupeKey } from "@/lib/business/utils/urlNormalization";
import { normalizeLabel } from "@/lib/business/utils/textNormalization";
import { parseOrThrow } from "@/lib/validation/parse";

function dedupeByUrl<TItem extends { url: string }>(items: TItem[]): TItem[] {
  return dedupeByKey(items, (item) => urlDedupeKey(item.url));
}

function unionStrings(existing: string[], incoming: string[]): string[] {
  return Array.from(new Set([...existing, ...incoming]));
}

export interface MergeBusinessProfileInput {
  businessModel?: string;
  valueProposition?: string;
  customerProblem?: string;
  customerSegments?: CustomerSegment[];
  revenueStrategy?: string;
  goToMarketStrategy?: string;
  distributionChannels?: string[];
  growthStrategy?: string;
  growthDrivers?: string[];
  expansionOpportunities?: string[];
  competitiveAdvantages?: string[];
  keyDependencies?: Dependency[];
  operationalRisks?: OperationalRisk[];
  businessStrengths?: string[];
  businessWeaknesses?: string[];
  businessOpportunities?: string[];
  businessThreats?: string[];
  sources?: Source[];
  evidence?: Evidence[];
  confidence: number;
}

// The core operation behind "this platform must accumulate knowledge over
// time" — mirrors the other three platforms' own profile mergers exactly.
// Structured/plain list fields union (dedupe by name or by exact string);
// sources/evidence union by URL; narrative scalar fields (businessModel,
// valueProposition, ...) take the incoming value only if supplied,
// otherwise keep the existing one — the same "incoming ?? existing"
// pattern lib/market's mergeMarketProfile uses for subIndustry. `refresh`
// reason is "scheduled" — the caller overrides it afterward if this merge
// was actually triggered by a manual/stale reason.
//
// Deliberately does NOT touch `economicMoat`, `overallHealth`, or
// `executionComplexity` — those are only ever recomputed by a future
// real-assessment module, never hand-merged, so a merge can never
// silently overwrite a real assessment with a stale one or vice versa.
export function mergeBusinessProfile(
  existing: BusinessProfile,
  incoming: MergeBusinessProfileInput,
  now: Date = new Date()
): BusinessProfile {
  return parseOrThrow(
    BusinessProfileSchema,
    {
      ...existing,
      businessModel: incoming.businessModel ?? existing.businessModel,
      valueProposition: incoming.valueProposition ?? existing.valueProposition,
      customerProblem: incoming.customerProblem ?? existing.customerProblem,
      customerSegments: dedupeByKey(
        [...existing.customerSegments, ...(incoming.customerSegments ?? [])],
        (segment) => normalizeLabel(segment.name)
      ),
      revenueStrategy: incoming.revenueStrategy ?? existing.revenueStrategy,
      goToMarketStrategy: incoming.goToMarketStrategy ?? existing.goToMarketStrategy,
      distributionChannels: unionStrings(existing.distributionChannels, incoming.distributionChannels ?? []),
      growthStrategy: incoming.growthStrategy ?? existing.growthStrategy,
      growthDrivers: unionStrings(existing.growthDrivers, incoming.growthDrivers ?? []),
      expansionOpportunities: unionStrings(
        existing.expansionOpportunities,
        incoming.expansionOpportunities ?? []
      ),
      competitiveAdvantages: unionStrings(
        existing.competitiveAdvantages,
        incoming.competitiveAdvantages ?? []
      ),
      keyDependencies: dedupeByKey(
        [...existing.keyDependencies, ...(incoming.keyDependencies ?? [])],
        (dependency) => normalizeLabel(dependency.name)
      ),
      operationalRisks: dedupeByKey(
        [...existing.operationalRisks, ...(incoming.operationalRisks ?? [])],
        (risk) => normalizeLabel(risk.name)
      ),
      businessStrengths: unionStrings(existing.businessStrengths, incoming.businessStrengths ?? []),
      businessWeaknesses: unionStrings(existing.businessWeaknesses, incoming.businessWeaknesses ?? []),
      businessOpportunities: unionStrings(
        existing.businessOpportunities,
        incoming.businessOpportunities ?? []
      ),
      businessThreats: unionStrings(existing.businessThreats, incoming.businessThreats ?? []),
      sources: dedupeByUrl([...existing.sources, ...(incoming.sources ?? [])]),
      evidence: dedupeByUrl([...existing.evidence, ...(incoming.evidence ?? [])]),
      confidence: incoming.confidence,
      refresh: buildBusinessRefreshMetadata("scheduled", incoming.confidence, now),
    },
    "Failed to build a schema-valid merged BusinessProfile."
  );
}
