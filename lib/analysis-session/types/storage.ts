import type { SessionRecord } from "@/lib/analysis-session/schemas/session.schema";

// The one interface every session-metadata backend implements — mirrors
// every prior platform's own store interface. Deliberately stores only
// SessionRecord (the tiny metadata shape) — never PipelineExecution
// itself, which remains lib/pipeline's own store's responsibility.
export interface AnalysisSessionStore {
  getById(id: string): Promise<SessionRecord | null>;
  list(): Promise<SessionRecord[]>;
  upsert(record: SessionRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
