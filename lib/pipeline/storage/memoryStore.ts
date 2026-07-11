import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like every Phase 1 platform's own memory
// store. Suitable for local development and single-instance deploys;
// see supabaseStore.ts/postgresStore.ts/warehouseStore.ts for the
// durable, multi-instance story.
export class MemoryPipelineStore implements PipelineExecutionStore {
  private readonly byId = new Map<string, PipelineExecution>();

  async getById(id: string): Promise<PipelineExecution | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<PipelineExecution[]> {
    return Array.from(this.byId.values());
  }

  async upsert(execution: PipelineExecution): Promise<void> {
    this.byId.set(execution.id, execution);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
