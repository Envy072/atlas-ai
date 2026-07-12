import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";
import { mergeMarketProfile } from "@/lib/market/knowledge/profileMerger";
import { defaultMarketStore } from "@/lib/market/storage/defaultStore";

// "The caller's job" MARKET_PLATFORM.md always said discovery itself
// never does (MILESTONE_17_DESIGN.md's "Market Discovery Strategy") —
// the first real caller. Resolves a freshly-built, still-unpersisted
// MarketProfile against the knowledge base by exact industry match (no
// fuzzy matching needed — MILESTONE_17_DESIGN.md's "A key asymmetry vs.
// Milestone 16"), and accumulates ONLY the durable-knowledge slice of
// MarketProfile ("## Knowledge vs Observation") — mergeMarketProfile's
// own MergeMarketProfileInput already excludes sizing/growthRate/
// marketMaturity from its merge contract, unchanged here.
export async function resolveMarketKnowledge(
  freshProfile: MarketProfile,
  store: MarketKnowledgeStore = defaultMarketStore
): Promise<MarketProfile> {
  // "unclassified" is not a real market identity — accumulating
  // unrelated ideas' evidence under one meaningless bucket would
  // degrade data quality, not improve it (MILESTONE_17_DESIGN.md
  // Section 5). Returned as-is, never persisted or merged.
  if (freshProfile.industry === "unclassified") {
    return freshProfile;
  }

  const existing = await store.findByIndustry(freshProfile.industry);

  const resolved = existing
    ? mergeMarketProfile(existing, {
        subIndustry: freshProfile.subIndustry,
        customerSegments: freshProfile.customerSegments,
        geographicMarkets: freshProfile.geographicMarkets,
        regulations: freshProfile.regulations,
        risks: freshProfile.risks,
        trends: freshProfile.trends,
        sources: freshProfile.sources,
        evidence: freshProfile.evidence,
        confidence: freshProfile.confidence,
      })
    : freshProfile;

  await store.upsert(resolved);
  return resolved;
}
