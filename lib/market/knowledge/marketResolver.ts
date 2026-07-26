import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";
import { mergeMarketProfile } from "@/lib/market/knowledge/profileMerger";
import { defaultMarketStore } from "@/lib/market/storage/defaultStore";

// "The caller's job" MARKET_PLATFORM.md always said discovery itself
// never does (MILESTONE_17_DESIGN.md's "Market Discovery Strategy") —
// the first real caller. Resolves a freshly-built, still-unpersisted
// MarketProfile against the knowledge base, and accumulates ONLY the
// durable-knowledge slice of MarketProfile ("## Knowledge vs
// Observation") — mergeMarketProfile's own MergeMarketProfileInput
// already excludes sizing/growthRate/marketMaturity from its merge
// contract, unchanged here.
//
// Milestone 116 — resolves by `analysisId`, the owning analysis's own
// pipeline execution id, never by industry alone. The original design
// (MILESTONE_17_DESIGN.md) resolved by exact industry match against a
// single, global knowledge base — durable accumulation *across*
// analyses was the explicit intent at the time, written before
// Authentication (Milestone 27) gave this codebase any concept of
// per-analysis identity to scope by. Once industry classification is a
// coarse, keyword-based heuristic (lib/market/classification/
// industryClassifier.ts) shared by many unrelated ideas, that same
// design silently merges one founder's market evidence into another's
// (Milestone 114's Critical Finding #1, directly reproduced live). This
// resolver now treats "resolve against existing knowledge" as "resolve
// against this SAME analysis's own prior attempt" (relevant for a
// retried decision stage), never another analysis's — durable
// cross-analysis accumulation is retired, not preserved with a smaller
// blast radius.
export async function resolveMarketKnowledge(
  freshProfile: MarketProfile,
  analysisId: string,
  store: MarketKnowledgeStore = defaultMarketStore
): Promise<MarketProfile> {
  // "unclassified" is not a real market identity — merging unrelated
  // ideas' evidence under one meaningless bucket would degrade data
  // quality, not improve it (MILESTONE_17_DESIGN.md Section 5). Returned
  // as-is, never persisted or merged, unchanged by Milestone 116 (still
  // true regardless of scoping: there is nothing meaningful to
  // accumulate against here even within one analysis).
  if (freshProfile.industry === "unclassified") {
    return { ...freshProfile, analysisId };
  }

  const existing = await store.getByAnalysisId(analysisId);

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
    : { ...freshProfile, analysisId };

  await store.upsert(resolved);
  return resolved;
}
