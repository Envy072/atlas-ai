import type { SessionRecord } from "@/lib/analysis-session/schemas/session.schema";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";

// ARCHITECTURE ONLY. A real implementation would back this with a
// Supabase table (via the existing, unmodified lib/supabase.ts client,
// which this milestone does not touch).
export class SupabaseAnalysisSessionStore implements AnalysisSessionStore {
  constructor(private readonly tableName: string = "analysis_sessions") {}

  async getById(id: string): Promise<SessionRecord | null> {
    void id;
    throw new Error(
      `SupabaseAnalysisSessionStore is architecture only — no "${this.tableName}" query is implemented yet.`
    );
  }

  async list(): Promise<SessionRecord[]> {
    throw new Error("SupabaseAnalysisSessionStore.list is not implemented yet.");
  }

  async upsert(record: SessionRecord): Promise<void> {
    void record;
    throw new Error("SupabaseAnalysisSessionStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("SupabaseAnalysisSessionStore.delete is not implemented yet.");
  }
}
