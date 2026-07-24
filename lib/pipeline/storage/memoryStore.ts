import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore, UpsertVersionCheckResult } from "@/lib/pipeline/types/storage";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like every Phase 1 platform's own memory
// store. Suitable for local development and single-instance deploys;
// see supabaseStore.ts for the durable, multi-instance story.
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

  // Real optimistic-concurrency semantics even in memory (Milestone 107)
  // — not just a stub, since pipelineEngine.test.ts's own race-condition
  // coverage exercises this exact method, and a memory store that
  // silently allowed every write would prove nothing. No row yet ("not
  // yet persisted", version 0) always succeeds — nothing else can
  // conflict with a row that doesn't exist. Otherwise, the write
  // succeeds only if the caller's expectedVersion matches what's
  // actually stored.
  async upsertWithVersionCheck(
    execution: PipelineExecution,
    expectedVersion: number
  ): Promise<UpsertVersionCheckResult> {
    const existing = this.byId.get(execution.id);

    if (existing && existing.version !== expectedVersion) {
      return { success: false, current: existing };
    }

    const nextVersion = expectedVersion + 1;
    this.byId.set(execution.id, { ...execution, version: nextVersion });
    return { success: true, version: nextVersion };
  }
}
