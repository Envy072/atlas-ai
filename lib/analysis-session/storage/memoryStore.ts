import type { SessionRecord } from "@/lib/analysis-session/schemas/session.schema";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like every prior platform's own memory store.
// Holds only the lightweight SessionRecord — never a duplicate of
// PipelineExecution.
export class MemoryAnalysisSessionStore implements AnalysisSessionStore {
  private readonly byId = new Map<string, SessionRecord>();

  async getById(id: string): Promise<SessionRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<SessionRecord[]> {
    return Array.from(this.byId.values());
  }

  async upsert(record: SessionRecord): Promise<void> {
    this.byId.set(record.id, record);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
