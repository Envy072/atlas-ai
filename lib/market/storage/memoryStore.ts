import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";
import { normalizeIndustryName } from "@/lib/market/utils/textNormalization";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like lib/competitors' MemoryCompetitorStore.
// Suitable for local development and single-instance deploys; see
// supabaseStore.ts/postgresStore.ts/warehouseStore.ts for the durable,
// multi-instance story.
export class MemoryMarketStore implements MarketKnowledgeStore {
  private readonly byId = new Map<string, MarketProfile>();

  async getById(id: string): Promise<MarketProfile | null> {
    return this.byId.get(id) ?? null;
  }

  async findByIndustry(industry: string): Promise<MarketProfile | null> {
    const normalized = normalizeIndustryName(industry);

    for (const profile of this.byId.values()) {
      if (normalizeIndustryName(profile.industry) === normalized) return profile;
    }

    return null;
  }

  async list(): Promise<MarketProfile[]> {
    return Array.from(this.byId.values());
  }

  async upsert(profile: MarketProfile): Promise<void> {
    this.byId.set(profile.id, profile);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
