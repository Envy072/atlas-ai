import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";

// ARCHITECTURE ONLY. For a future deployment running its own Postgres
// instance directly (bypassing Supabase's client) — e.g. a dedicated read
// replica for heavy cross-market analytical queries. No `pg`/`postgres`
// dependency exists in this project yet.
export class PostgresMarketStore implements MarketKnowledgeStore {
  constructor(private readonly connectionString: string) {}

  async getById(id: string): Promise<MarketProfile | null> {
    void id;
    throw new Error(
      `PostgresMarketStore is architecture only — no connection is established yet (would target ${this.connectionString}).`
    );
  }

  async findByIndustry(industry: string): Promise<MarketProfile | null> {
    void industry;
    throw new Error("PostgresMarketStore.findByIndustry is not implemented yet.");
  }

  async list(): Promise<MarketProfile[]> {
    throw new Error("PostgresMarketStore.list is not implemented yet.");
  }

  async upsert(profile: MarketProfile): Promise<void> {
    void profile;
    throw new Error("PostgresMarketStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("PostgresMarketStore.delete is not implemented yet.");
  }
}
