import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";

// ARCHITECTURE ONLY. A real implementation would back this with a
// Supabase table (via the existing, unmodified lib/supabase.ts client,
// which this milestone does not touch).
export class SupabasePipelineStore implements PipelineExecutionStore {
  constructor(private readonly tableName: string = "pipeline_executions") {}

  async getById(id: string): Promise<PipelineExecution | null> {
    void id;
    throw new Error(
      `SupabasePipelineStore is architecture only — no "${this.tableName}" query is implemented yet.`
    );
  }

  async list(): Promise<PipelineExecution[]> {
    throw new Error("SupabasePipelineStore.list is not implemented yet.");
  }

  async upsert(execution: PipelineExecution): Promise<void> {
    void execution;
    throw new Error("SupabasePipelineStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("SupabasePipelineStore.delete is not implemented yet.");
  }
}
