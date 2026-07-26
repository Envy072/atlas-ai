import type { MarketProfile } from "@/lib/market/schemas/market.schema";

// The one interface every knowledge-base backend implements — mirrors
// lib/competitors' CompetitorKnowledgeStore exactly (same project, same
// pattern).
//
// Milestone 116 — getByAnalysisId() replaces the old, global
// findByIndustry(industry): a market profile now belongs to exactly one
// analysis, so the only legitimate "existing profile to resolve against"
// lookup is by that analysis's own id, never by industry alone (which
// let two unrelated analyses sharing a coarse classifier bucket merge
// each other's evidence — Milestone 114's Critical Finding #1). list()
// is scoped by the same id for the identical reason, even though nothing
// calls it today beyond tests — ownership is enforced by the store's own
// query surface, not left to each caller to remember to filter by.
export interface MarketKnowledgeStore {
  getById(id: string): Promise<MarketProfile | null>;
  getByAnalysisId(analysisId: string): Promise<MarketProfile | null>;
  list(analysisId: string): Promise<MarketProfile[]>;
  upsert(profile: MarketProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
