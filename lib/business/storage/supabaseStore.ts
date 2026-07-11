import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import type { BusinessHealthRating } from "@/lib/business/schemas/enums";
import type { BusinessKnowledgeStore } from "@/lib/business/types/storage";

// ARCHITECTURE ONLY. A real implementation would back this with a
// Supabase table (via the existing, unmodified lib/supabase.ts client,
// which this milestone does not touch). Conforms to the same
// BusinessKnowledgeStore interface as memoryStore.ts, so switching the
// platform's default backend later is a one-line change in createStore.ts.
export class SupabaseBusinessStore implements BusinessKnowledgeStore {
  constructor(private readonly tableName: string = "business_profiles") {}

  async getById(id: string): Promise<BusinessProfile | null> {
    void id;
    throw new Error(
      `SupabaseBusinessStore is architecture only — no "${this.tableName}" query is implemented yet.`
    );
  }

  async findByHealthRating(rating: BusinessHealthRating): Promise<BusinessProfile[]> {
    void rating;
    throw new Error("SupabaseBusinessStore.findByHealthRating is not implemented yet.");
  }

  async list(): Promise<BusinessProfile[]> {
    throw new Error("SupabaseBusinessStore.list is not implemented yet.");
  }

  async upsert(profile: BusinessProfile): Promise<void> {
    void profile;
    throw new Error("SupabaseBusinessStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("SupabaseBusinessStore.delete is not implemented yet.");
  }
}
