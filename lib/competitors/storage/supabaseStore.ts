import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";

// ARCHITECTURE ONLY. A real implementation would back this with a
// Supabase table (via the existing, unmodified lib/supabase.ts client,
// which this milestone does not touch — lib/supabase.ts is not in
// lib/schemas/lib/store/lib/research/lib/analysis/app/api and so isn't
// frozen, but no new query logic belongs here until this class is
// actually implemented). Conforms to the same CompetitorKnowledgeStore
// interface as memoryStore.ts, so switching the platform's default
// backend later is a one-line change in createStore.ts, not a rewrite of
// any caller.
export class SupabaseCompetitorStore implements CompetitorKnowledgeStore {
  constructor(private readonly tableName: string = "competitor_profiles") {}

  async getById(id: string): Promise<CompanyProfile | null> {
    void id;
    throw new Error(
      `SupabaseCompetitorStore is architecture only — no "${this.tableName}" query is implemented yet.`
    );
  }

  async findByName(name: string): Promise<CompanyProfile | null> {
    void name;
    throw new Error("SupabaseCompetitorStore.findByName is not implemented yet.");
  }

  async list(): Promise<CompanyProfile[]> {
    throw new Error("SupabaseCompetitorStore.list is not implemented yet.");
  }

  async upsert(profile: CompanyProfile): Promise<void> {
    void profile;
    throw new Error("SupabaseCompetitorStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("SupabaseCompetitorStore.delete is not implemented yet.");
  }
}
