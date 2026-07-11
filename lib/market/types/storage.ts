import type { MarketProfile } from "@/lib/market/schemas/market.schema";

// The one interface every knowledge-base backend implements — mirrors
// lib/competitors' CompetitorKnowledgeStore exactly (same project, same
// pattern), but keyed by industry rather than by company name.
export interface MarketKnowledgeStore {
  getById(id: string): Promise<MarketProfile | null>;
  findByIndustry(industry: string): Promise<MarketProfile | null>;
  list(): Promise<MarketProfile[]>;
  upsert(profile: MarketProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
