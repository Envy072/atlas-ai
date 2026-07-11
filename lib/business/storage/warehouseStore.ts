import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import type { BusinessHealthRating } from "@/lib/business/schemas/enums";
import type { BusinessKnowledgeStore } from "@/lib/business/types/storage";

// ARCHITECTURE ONLY, FUTURE PROVIDER. A knowledge warehouse (BigQuery,
// Snowflake, ClickHouse — undecided) would let a future Reports/Dashboard/
// Investor Intelligence module run aggregate queries across every known
// business profile ("what fraction of seed-stage SaaS ideas show a
// 'stable' overall health rating") instead of only per-profile lookups.
// Implements the same BusinessKnowledgeStore interface as every other
// backend so it's a drop-in swap via createStore.ts, plus one extra
// method (aggregateByHealthRating) genuinely specific to a warehouse
// backend.
export interface WarehouseBusinessStore extends BusinessKnowledgeStore {
  aggregateByHealthRating(
    rating: BusinessHealthRating
  ): Promise<{ profileCount: number; averageConfidence: number }>;
}

export class KnowledgeWarehouseBusinessStore implements WarehouseBusinessStore {
  constructor(private readonly datasetName: string = "business_profiles_warehouse") {}

  async getById(id: string): Promise<BusinessProfile | null> {
    void id;
    throw new Error(
      `KnowledgeWarehouseBusinessStore is architecture only — no warehouse dataset "${this.datasetName}" is connected yet.`
    );
  }

  async findByHealthRating(rating: BusinessHealthRating): Promise<BusinessProfile[]> {
    void rating;
    throw new Error("KnowledgeWarehouseBusinessStore.findByHealthRating is not implemented yet.");
  }

  async list(): Promise<BusinessProfile[]> {
    throw new Error("KnowledgeWarehouseBusinessStore.list is not implemented yet.");
  }

  async upsert(profile: BusinessProfile): Promise<void> {
    void profile;
    throw new Error("KnowledgeWarehouseBusinessStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("KnowledgeWarehouseBusinessStore.delete is not implemented yet.");
  }

  async aggregateByHealthRating(
    rating: BusinessHealthRating
  ): Promise<{ profileCount: number; averageConfidence: number }> {
    void rating;
    throw new Error("KnowledgeWarehouseBusinessStore.aggregateByHealthRating is not implemented yet.");
  }
}
