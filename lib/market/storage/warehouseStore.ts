import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";

// ARCHITECTURE ONLY, FUTURE PROVIDER. An analytical warehouse (BigQuery,
// Snowflake, ClickHouse — undecided) would let a future Reports/Dashboard
// module run aggregate queries across every known market ("average CAGR
// across all fintech sub-industries") instead of only per-market lookups.
// Implements the same MarketKnowledgeStore interface as every other
// backend so it's a drop-in swap via createStore.ts, plus one extra
// method (aggregateByIndustry) genuinely specific to a warehouse backend —
// callers that don't need aggregate queries keep depending on the base
// interface only.
export interface WarehouseMarketStore extends MarketKnowledgeStore {
  aggregateByIndustry(industry: string): Promise<{ profileCount: number; averageConfidence: number }>;
}

export class AnalyticalWarehouseMarketStore implements WarehouseMarketStore {
  constructor(private readonly datasetName: string = "market_profiles_warehouse") {}

  async getById(id: string): Promise<MarketProfile | null> {
    void id;
    throw new Error(
      `AnalyticalWarehouseMarketStore is architecture only — no warehouse dataset "${this.datasetName}" is connected yet.`
    );
  }

  async findByIndustry(industry: string): Promise<MarketProfile | null> {
    void industry;
    throw new Error("AnalyticalWarehouseMarketStore.findByIndustry is not implemented yet.");
  }

  async list(): Promise<MarketProfile[]> {
    throw new Error("AnalyticalWarehouseMarketStore.list is not implemented yet.");
  }

  async upsert(profile: MarketProfile): Promise<void> {
    void profile;
    throw new Error("AnalyticalWarehouseMarketStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("AnalyticalWarehouseMarketStore.delete is not implemented yet.");
  }

  async aggregateByIndustry(industry: string): Promise<{ profileCount: number; averageConfidence: number }> {
    void industry;
    throw new Error("AnalyticalWarehouseMarketStore.aggregateByIndustry is not implemented yet.");
  }
}
