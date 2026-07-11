import type { SessionRecord } from "@/lib/analysis-session/schemas/session.schema";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";

// ARCHITECTURE ONLY, FUTURE PROVIDER. A knowledge warehouse would let a
// future Reports/Dashboard module run aggregate queries across every
// session ever created ("how many sessions were started this week")
// instead of only per-session lookups. Implements the same
// AnalysisSessionStore interface as every other backend so it's a
// drop-in swap via createStore.ts, plus one extra method
// (countSessionsCreatedBetween) genuinely specific to a warehouse
// backend.
export interface WarehouseAnalysisSessionStore extends AnalysisSessionStore {
  countSessionsCreatedBetween(startIso: string, endIso: string): Promise<number>;
}

export class KnowledgeWarehouseAnalysisSessionStore implements WarehouseAnalysisSessionStore {
  constructor(private readonly datasetName: string = "analysis_sessions_warehouse") {}

  async getById(id: string): Promise<SessionRecord | null> {
    void id;
    throw new Error(
      `KnowledgeWarehouseAnalysisSessionStore is architecture only — no warehouse dataset "${this.datasetName}" is connected yet.`
    );
  }

  async list(): Promise<SessionRecord[]> {
    throw new Error("KnowledgeWarehouseAnalysisSessionStore.list is not implemented yet.");
  }

  async upsert(record: SessionRecord): Promise<void> {
    void record;
    throw new Error("KnowledgeWarehouseAnalysisSessionStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("KnowledgeWarehouseAnalysisSessionStore.delete is not implemented yet.");
  }

  async countSessionsCreatedBetween(startIso: string, endIso: string): Promise<number> {
    void startIso;
    void endIso;
    throw new Error("KnowledgeWarehouseAnalysisSessionStore.countSessionsCreatedBetween is not implemented yet.");
  }
}
