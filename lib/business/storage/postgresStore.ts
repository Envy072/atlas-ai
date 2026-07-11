import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import type { BusinessHealthRating } from "@/lib/business/schemas/enums";
import type { BusinessKnowledgeStore } from "@/lib/business/types/storage";

// ARCHITECTURE ONLY. For a future deployment running its own Postgres
// instance directly (bypassing Supabase's client) — e.g. a dedicated read
// replica for heavy cross-profile analytical queries. No `pg`/`postgres`
// dependency exists in this project yet.
export class PostgresBusinessStore implements BusinessKnowledgeStore {
  constructor(private readonly connectionString: string) {}

  async getById(id: string): Promise<BusinessProfile | null> {
    void id;
    throw new Error(
      `PostgresBusinessStore is architecture only — no connection is established yet (would target ${this.connectionString}).`
    );
  }

  async findByHealthRating(rating: BusinessHealthRating): Promise<BusinessProfile[]> {
    void rating;
    throw new Error("PostgresBusinessStore.findByHealthRating is not implemented yet.");
  }

  async list(): Promise<BusinessProfile[]> {
    throw new Error("PostgresBusinessStore.list is not implemented yet.");
  }

  async upsert(profile: BusinessProfile): Promise<void> {
    void profile;
    throw new Error("PostgresBusinessStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("PostgresBusinessStore.delete is not implemented yet.");
  }
}
