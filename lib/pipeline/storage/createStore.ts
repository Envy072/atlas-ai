import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";
import { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";
import { SupabasePipelineStore } from "@/lib/pipeline/storage/supabaseStore";
import { PostgresPipelineStore } from "@/lib/pipeline/storage/postgresStore";
import { KnowledgeWarehousePipelineStore } from "@/lib/pipeline/storage/warehouseStore";

export type PipelineStoreBackend = "memory" | "supabase" | "postgres" | "warehouse";

export interface CreatePipelineStoreOptions {
  backend?: PipelineStoreBackend;
  supabaseTableName?: string;
  postgresConnectionString?: string;
  warehouseDatasetName?: string;
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
    case "postgres":
      return new PostgresPipelineStore(options.postgresConnectionString ?? "");
    case "warehouse":
      return new KnowledgeWarehousePipelineStore(options.warehouseDatasetName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown pipeline store backend: ${exhaustiveCheck}`);
    }
  }
}
