import type { Source, Evidence } from "@/lib/research";
import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import { MarketProfileSchema } from "@/lib/market/schemas/market.schema";
import type { CustomerSegment } from "@/lib/market/schemas/segmentation.schema";
import type { GeographicMarket } from "@/lib/market/schemas/geography.schema";
import type { MarketTrend } from "@/lib/market/schemas/trends.schema";
import type { Regulation } from "@/lib/market/schemas/regulation.schema";
import type { MarketRisk } from "@/lib/market/schemas/risks.schema";
import { buildMarketRefreshMetadata } from "@/lib/market/refresh/marketRefreshPolicy";
import { dedupeByKey } from "@/lib/market/utils/dedupeByKey";
import { urlDedupeKey } from "@/lib/market/utils/urlNormalization";
import { normalizeIndustryName } from "@/lib/market/utils/textNormalization";
import { parseOrThrow } from "@/lib/validation/parse";

function dedupeByUrl<TItem extends { url: string }>(items: TItem[]): TItem[] {
  return dedupeByKey(items, (item) => urlDedupeKey(item.url));
}

export interface MergeMarketProfileInput {
  subIndustry?: string;
  customerSegments?: CustomerSegment[];
  geographicMarkets?: GeographicMarket[];
  regulations?: Regulation[];
  risks?: MarketRisk[];
  trends?: MarketTrend[];
  sources?: Source[];
  evidence?: Evidence[];
  confidence: number;
}

// The core operation behind "this platform must accumulate knowledge over
// time" — mirrors lib/competitors' mergeCompanyProfile exactly. Given an
// already-known MarketProfile and freshly discovered data about the same
// market, folds the new data in rather than replacing the profile
// outright. Structured list fields dedupe by a name-based key (since,
// unlike CompanyProfile's plain string lists, these are objects);
// sources/evidence dedupe by URL. `confidence` takes the incoming value
// and drives the next refresh schedule, reason "scheduled" — the caller
// overrides `refresh` afterward if this merge was actually triggered by a
// manual/stale reason (see refresh/marketRefreshEngine.ts).
export function mergeMarketProfile(
  existing: MarketProfile,
  incoming: MergeMarketProfileInput,
  now: Date = new Date()
): MarketProfile {
  return parseOrThrow(
    MarketProfileSchema,
    {
      ...existing,
      subIndustry: incoming.subIndustry ?? existing.subIndustry,
      customerSegments: dedupeByKey(
        [...existing.customerSegments, ...(incoming.customerSegments ?? [])],
        (segment) => normalizeIndustryName(segment.name)
      ),
      geographicMarkets: dedupeByKey(
        [...existing.geographicMarkets, ...(incoming.geographicMarkets ?? [])],
        (market) => normalizeIndustryName(`${market.region}:${market.country ?? ""}`)
      ),
      regulations: dedupeByKey(
        [...existing.regulations, ...(incoming.regulations ?? [])],
        (regulation) => normalizeIndustryName(regulation.name)
      ),
      risks: dedupeByKey(
        [...existing.risks, ...(incoming.risks ?? [])],
        (risk) => normalizeIndustryName(risk.name)
      ),
      trends: dedupeByKey(
        [...existing.trends, ...(incoming.trends ?? [])],
        (trend) => normalizeIndustryName(trend.name)
      ),
      sources: dedupeByUrl([...existing.sources, ...(incoming.sources ?? [])]),
      evidence: dedupeByUrl([...existing.evidence, ...(incoming.evidence ?? [])]),
      confidence: incoming.confidence,
      refresh: buildMarketRefreshMetadata("scheduled", incoming.confidence, now),
    },
    "Failed to build a schema-valid merged MarketProfile."
  );
}
