import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { DecisionKnowledgeStore } from "@/lib/decision/types/storage";

// ARCHITECTURE ONLY. A real implementation would back this with a
// Supabase table (via the existing, unmodified lib/supabase.ts client,
// which this milestone does not touch).
export class SupabaseDecisionStore implements DecisionKnowledgeStore {
  constructor(private readonly tableName: string = "decision_profiles") {}

  async getById(id: string): Promise<DecisionProfile | null> {
    void id;
    throw new Error(
      `SupabaseDecisionStore is architecture only — no "${this.tableName}" query is implemented yet.`
    );
  }

  async list(): Promise<DecisionProfile[]> {
    throw new Error("SupabaseDecisionStore.list is not implemented yet.");
  }

  async upsert(profile: DecisionProfile): Promise<void> {
    void profile;
    throw new Error("SupabaseDecisionStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("SupabaseDecisionStore.delete is not implemented yet.");
  }
}
