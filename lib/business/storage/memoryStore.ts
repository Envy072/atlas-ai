import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import type { BusinessHealthRating } from "@/lib/business/schemas/enums";
import type { BusinessKnowledgeStore } from "@/lib/business/types/storage";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like the other three platforms' memory stores.
// Suitable for local development and single-instance deploys; see
// supabaseStore.ts/postgresStore.ts/warehouseStore.ts for the durable,
// multi-instance story.
export class MemoryBusinessStore implements BusinessKnowledgeStore {
  private readonly byId = new Map<string, BusinessProfile>();

  async getById(id: string): Promise<BusinessProfile | null> {
    return this.byId.get(id) ?? null;
  }

  async findByHealthRating(rating: BusinessHealthRating): Promise<BusinessProfile[]> {
    return Array.from(this.byId.values()).filter((profile) => profile.overallHealth.rating === rating);
  }

  async list(): Promise<BusinessProfile[]> {
    return Array.from(this.byId.values());
  }

  async upsert(profile: BusinessProfile): Promise<void> {
    this.byId.set(profile.id, profile);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
