import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineState } from "@/lib/pipeline/schemas/enums";
import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";

// ARCHITECTURE ONLY, FUTURE PROVIDER. A knowledge warehouse would let a
// future Reports/Dashboard module run aggregate queries across every
// execution ("average completion time across all completed runs this
// week") instead of only per-execution lookups. Implements the same
// PipelineExecutionStore interface as every other backend so it's a
// drop-in swap via createStore.ts, plus one extra method
// (aggregateByState) genuinely specific to a warehouse backend.
export interface WarehousePipelineStore extends PipelineExecutionStore {
  aggregateByState(state: PipelineState): Promise<{ executionCount: number; averageDurationMs: number }>;
}

export class KnowledgeWarehousePipelineStore implements WarehousePipelineStore {
  constructor(private readonly datasetName: string = "pipeline_executions_warehouse") {}

  async getById(id: string): Promise<PipelineExecution | null> {
    void id;
    throw new Error(
      `KnowledgeWarehousePipelineStore is architecture only — no warehouse dataset "${this.datasetName}" is connected yet.`
    );
  }

  async list(): Promise<PipelineExecution[]> {
    throw new Error("KnowledgeWarehousePipelineStore.list is not implemented yet.");
  }

  async upsert(execution: PipelineExecution): Promise<void> {
    void execution;
    throw new Error("KnowledgeWarehousePipelineStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("KnowledgeWarehousePipelineStore.delete is not implemented yet.");
  }

  async aggregateByState(
    state: PipelineState
  ): Promise<{ executionCount: number; averageDurationMs: number }> {
    void state;
    throw new Error("KnowledgeWarehousePipelineStore.aggregateByState is not implemented yet.");
  }
}
