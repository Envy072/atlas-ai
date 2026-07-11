import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";

// ARCHITECTURE ONLY. For a future deployment running its own Postgres
// instance directly (bypassing Supabase's client). No `pg`/`postgres`
// dependency exists in this project yet.
export class PostgresPipelineStore implements PipelineExecutionStore {
  constructor(private readonly connectionString: string) {}

  async getById(id: string): Promise<PipelineExecution | null> {
    void id;
    throw new Error(
      `PostgresPipelineStore is architecture only — no connection is established yet (would target ${this.connectionString}).`
    );
  }

  async list(): Promise<PipelineExecution[]> {
    throw new Error("PostgresPipelineStore.list is not implemented yet.");
  }

  async upsert(execution: PipelineExecution): Promise<void> {
    void execution;
    throw new Error("PostgresPipelineStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("PostgresPipelineStore.delete is not implemented yet.");
  }
}
