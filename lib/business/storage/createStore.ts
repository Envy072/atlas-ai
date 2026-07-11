import type { BusinessKnowledgeStore } from "@/lib/business/types/storage";
import { MemoryBusinessStore } from "@/lib/business/storage/memoryStore";
import { SupabaseBusinessStore } from "@/lib/business/storage/supabaseStore";
import { PostgresBusinessStore } from "@/lib/business/storage/postgresStore";
import { KnowledgeWarehouseBusinessStore } from "@/lib/business/storage/warehouseStore";

export type BusinessStoreBackend = "memory" | "supabase" | "postgres" | "warehouse";

export interface CreateBusinessStoreOptions {
  backend?: BusinessStoreBackend;
  supabaseTableName?: string;
  postgresConnectionString?: string;
  warehouseDatasetName?: string;
}

// The single place that decides which BusinessKnowledgeStore
// implementation to use — mirrors the other three platforms' own
// createStore.ts. Callers depend on this factory (and the
// BusinessKnowledgeStore interface it returns), never on a specific
// class.
export function createStore(options: CreateBusinessStoreOptions = {}): BusinessKnowledgeStore {
  const backend = options.backend ?? "memory";

  switch (backend) {
    case "memory":
      return new MemoryBusinessStore();
    case "supabase":
      return new SupabaseBusinessStore(options.supabaseTableName);
    case "postgres":
      return new PostgresBusinessStore(options.postgresConnectionString ?? "");
    case "warehouse":
      return new KnowledgeWarehouseBusinessStore(options.warehouseDatasetName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown business store backend: ${exhaustiveCheck}`);
    }
  }
}
