import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";

// The one interface every checkpoint backend implements — mirrors every
// Phase 1 platform's own store interface. Deliberately no `findByX`
// secondary index, for the same reason lib/decision's
// DecisionKnowledgeStore has none: a PipelineExecution has no shared-
// categorical attribute of its own worth indexing on.
export interface PipelineExecutionStore {
  getById(id: string): Promise<PipelineExecution | null>;
  list(): Promise<PipelineExecution[]>;
  upsert(execution: PipelineExecution): Promise<void>;
  delete(id: string): Promise<void>;
}
