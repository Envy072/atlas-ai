import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";
import { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";
import { SupabasePipelineStore } from "@/lib/pipeline/storage/supabaseStore";

// Milestone 50 — the raw-Postgres and Warehouse backends were both
// always "ARCHITECTURE ONLY" (every method threw "not implemented
// yet"), had zero live callers anywhere, and were never the roadmap's
// chosen future direction (Supabase is) — retired, not replaced.
export type PipelineStoreBackend = "memory" | "supabase";

export interface CreatePipelineStoreOptions {
  backend?: PipelineStoreBackend;
  supabaseTableName?: string;
}

// The single place that decides which PipelineExecutionStore
// implementation to use — mirrors every Phase 1 platform's own
// createStore.ts. Callers depend on this factory (and the
// PipelineExecutionStore interface it returns), never on a specific
// class.
export function createStore(options: CreatePipelineStoreOptions = {}): PipelineExecutionStore {
  const backend = options.backend ?? "memory";

  switch (backend) {
    case "memory":
      return new MemoryPipelineStore();
    case "supabase":
      return new SupabasePipelineStore(options.supabaseTableName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown pipeline store backend: ${exhaustiveCheck}`);
    }
  }
}
