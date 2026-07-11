import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";

// ARCHITECTURE ONLY. For a future deployment that runs its own Postgres
// instance directly (bypassing Supabase's client) rather than through
// supabaseStore.ts — e.g. a dedicated read replica for heavy comparison
// queries across thousands of companies. No `pg`/`postgres` dependency
// exists in this project yet; adding one is this class's future
// implementation work, not this milestone's.
export class PostgresCompetitorStore implements CompetitorKnowledgeStore {
  constructor(private readonly connectionString: string) {}

  async getById(id: string): Promise<CompanyProfile | null> {
    void id;
    throw new Error(
      `PostgresCompetitorStore is architecture only — no connection is established yet (would target ${this.connectionString}).`
    );
  }

  async findByName(name: string): Promise<CompanyProfile | null> {
    void name;
    throw new Error("PostgresCompetitorStore.findByName is not implemented yet.");
  }

  async list(): Promise<CompanyProfile[]> {
    throw new Error("PostgresCompetitorStore.list is not implemented yet.");
  }

  async upsert(profile: CompanyProfile): Promise<void> {
    void profile;
    throw new Error("PostgresCompetitorStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("PostgresCompetitorStore.delete is not implemented yet.");
  }
}
