import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";

// The result of a version-conditional write (Milestone 107's approved
// concurrency design) — a structured outcome, never a thrown exception,
// since losing a version race is an expected, routine outcome for a
// caller to branch on, not an error condition in itself. `current` on
// failure is the adapter's own fresh read of the row that won, handed
// back so the caller never needs a second round-trip just to see what
// beat it.
export type UpsertVersionCheckResult =
  | { success: true; version: number }
  | { success: false; current: PipelineExecution };

// The one interface every checkpoint backend implements — mirrors every
// Phase 1 platform's own store interface, extended with one
// pipeline-specific method (Milestone 107): unlike analysis_sessions
// (write-once, no concurrent-writer race — Milestone 104C), a
// PipelineExecution is written repeatedly by a stage-runner that can
// race a concurrent cancelPipeline() call, so this store's own contract
// needs a conditional write the generic StorageAdapter<T> deliberately
// doesn't provide. `upsert` remains, unconditional, for callers with a
// genuine need to write without a version check (test fixture seeding
// — see pipelineEngine.test.ts — never production persistence, which
// always goes through upsertWithVersionCheck as of this milestone).
// Deliberately no `findByX` secondary index, for the same reason
// lib/decision's DecisionKnowledgeStore has none: a PipelineExecution
// has no shared-categorical attribute of its own worth indexing on.
export interface PipelineExecutionStore {
  getById(id: string): Promise<PipelineExecution | null>;
  list(): Promise<PipelineExecution[]>;
  upsert(execution: PipelineExecution): Promise<void>;
  delete(id: string): Promise<void>;
  upsertWithVersionCheck(execution: PipelineExecution, expectedVersion: number): Promise<UpsertVersionCheckResult>;
}
