import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";

// ARCHITECTURE ONLY. A real implementation would back this with a
// Supabase table (via the existing, unmodified lib/supabase.ts client,
// which this milestone does not touch). Conforms to the same
// MarketKnowledgeStore interface as memoryStore.ts, so switching the
// platform's default backend later is a one-line change in createStore.ts.
export class SupabaseMarketStore implements MarketKnowledgeStore {
  constructor(private readonly tableName: string = "market_profiles") {}

  async getById(id: string): Promise<MarketProfile | null> {
    void id;
    throw new Error(
      `SupabaseMarketStore is architecture only — no "${this.tableName}" query is implemented yet.`
    );
  }

  async findByIndustry(industry: string): Promise<MarketProfile | null> {
    void industry;
    throw new Error("SupabaseMarketStore.findByIndustry is not implemented yet.");
  }

  async list(): Promise<MarketProfile[]> {
    throw new Error("SupabaseMarketStore.list is not implemented yet.");
  }

  async upsert(profile: MarketProfile): Promise<void> {
    void profile;
    throw new Error("SupabaseMarketStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("SupabaseMarketStore.delete is not implemented yet.");
  }
}
