import type { Source, Evidence } from "@/lib/research";
import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import { MarketProfileSchema } from "@/lib/market/schemas/market.schema";
import type { MarketSizing, MarketGrowthRate } from "@/lib/market/schemas/sizing.schema";
import type { CustomerSegment } from "@/lib/market/schemas/segmentation.schema";
import type { GeographicMarket } from "@/lib/market/schemas/geography.schema";
import type { MarketTrend } from "@/lib/market/schemas/trends.schema";
import type { Regulation } from "@/lib/market/schemas/regulation.schema";
import type { MarketRisk } from "@/lib/market/schemas/risks.schema";
import type { MarketMaturity } from "@/lib/market/schemas/enums";
import { buildMarketSizing } from "@/lib/market/sizing/marketSizing";
import { buildMarketRefreshMetadata } from "@/lib/market/refresh/marketRefreshPolicy";
import { parseOrThrow } from "@/lib/validation/parse";

let marketIdCounter = 0;

function nextMarketId(): string {
  marketIdCounter += 1;
  return `market_${Date.now()}_${marketIdCounter}`;
}

export interface BuildMarketProfileInput {
  industry: string;
  subIndustry?: string;
  sizing?: MarketSizing;
  customerSegments?: CustomerSegment[];
  geographicMarkets?: GeographicMarket[];
  growthRate?: MarketGrowthRate;
  marketMaturity?: MarketMaturity;
  regulations?: Regulation[];
  risks?: MarketRisk[];
  trends?: MarketTrend[];
  sources?: Source[];
  evidence?: Evidence[];
  confidence: number;
  now?: Date;
}

// The one place a brand-new MarketProfile gets constructed — mirrors
// lib/competitors' buildCompanyProfile exactly. Every field beyond
// industry/confidence starts empty/undefined unless the caller supplies
// real data; `sizing` defaults to sizing/buildMarketSizing's honest
// "not yet computed" placeholder rather than an omitted field, since
// MarketProfileSchema requires the sizing object to be present (its
// internal tam/sam/som values may still be entirely unknown).
export function buildMarketProfile(input: BuildMarketProfileInput): MarketProfile {
  const now = input.now ?? new Date();

  return parseOrThrow(
    MarketProfileSchema,
    {
      id: nextMarketId(),
      industry: input.industry,
      subIndustry: input.subIndustry,
      sizing: input.sizing ?? buildMarketSizing({ industry: input.industry }),
      customerSegments: input.customerSegments ?? [],
      geographicMarkets: input.geographicMarkets ?? [],
      growthRate: input.growthRate,
      marketMaturity: input.marketMaturity,
      regulations: input.regulations ?? [],
      risks: input.risks ?? [],
      trends: input.trends ?? [],
      sources: input.sources ?? [],
      evidence: input.evidence ?? [],
      confidence: input.confidence,
      refresh: buildMarketRefreshMetadata("initial_discovery", input.confidence, now),
    },
    "Failed to build a schema-valid MarketProfile."
  );
}
