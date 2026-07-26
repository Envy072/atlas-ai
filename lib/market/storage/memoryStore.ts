import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like lib/competitors' MemoryCompetitorStore.
// Suitable for local development and single-instance deploys; see
// supabaseStore.ts/postgresStore.ts/warehouseStore.ts for the durable,
// multi-instance story.
//
// Milestone 116 — getByAnalysisId()/list() both filter by analysisId
// directly against the stored value, replacing the old, global
// findByIndustry(industry) lookup: ownership is enforced by the store
// itself, not by a caller remembering to check.
export class MemoryMarketStore implements MarketKnowledgeStore {
  private readonly byId = new Map<string, MarketProfile>();

  async getById(id: string): Promise<MarketProfile | null> {
    return this.byId.get(id) ?? null;
  }

  async getByAnalysisId(analysisId: string): Promise<MarketProfile | null> {
    for (const profile of this.byId.values()) {
      if (profile.analysisId === analysisId) return profile;
    }

    return null;
  }

  async list(analysisId: string): Promise<MarketProfile[]> {
    return Array.from(this.byId.values()).filter((profile) => profile.analysisId === analysisId);
  }

  async upsert(profile: MarketProfile): Promise<void> {
    this.byId.set(profile.id, profile);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
