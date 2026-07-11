import type { SessionRecord } from "@/lib/analysis-session/schemas/session.schema";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";

// ARCHITECTURE ONLY. For a future deployment running its own Postgres
// instance directly (bypassing Supabase's client). No `pg`/`postgres`
// dependency exists in this project yet.
export class PostgresAnalysisSessionStore implements AnalysisSessionStore {
  constructor(private readonly connectionString: string) {}

  async getById(id: string): Promise<SessionRecord | null> {
    void id;
    throw new Error(
      `PostgresAnalysisSessionStore is architecture only — no connection is established yet (would target ${this.connectionString}).`
    );
  }

  async list(): Promise<SessionRecord[]> {
    throw new Error("PostgresAnalysisSessionStore.list is not implemented yet.");
  }

  async upsert(record: SessionRecord): Promise<void> {
    void record;
    throw new Error("PostgresAnalysisSessionStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("PostgresAnalysisSessionStore.delete is not implemented yet.");
  }
}
