import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { DecisionKnowledgeStore } from "@/lib/decision/types/storage";

// ARCHITECTURE ONLY. For a future deployment running its own Postgres
// instance directly (bypassing Supabase's client). No `pg`/`postgres`
// dependency exists in this project yet.
export class PostgresDecisionStore implements DecisionKnowledgeStore {
  constructor(private readonly connectionString: string) {}

  async getById(id: string): Promise<DecisionProfile | null> {
    void id;
    throw new Error(
      `PostgresDecisionStore is architecture only — no connection is established yet (would target ${this.connectionString}).`
    );
  }

  async list(): Promise<DecisionProfile[]> {
    throw new Error("PostgresDecisionStore.list is not implemented yet.");
  }

  async upsert(profile: DecisionProfile): Promise<void> {
    void profile;
    throw new Error("PostgresDecisionStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("PostgresDecisionStore.delete is not implemented yet.");
  }
}
