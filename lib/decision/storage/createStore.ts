import type { DecisionKnowledgeStore } from "@/lib/decision/types/storage";
import { MemoryDecisionStore } from "@/lib/decision/storage/memoryStore";
import { SupabaseDecisionStore } from "@/lib/decision/storage/supabaseStore";
import { PostgresDecisionStore } from "@/lib/decision/storage/postgresStore";
import { KnowledgeWarehouseDecisionStore } from "@/lib/decision/storage/warehouseStore";

export type DecisionStoreBackend = "memory" | "supabase" | "postgres" | "warehouse";

export interface CreateDecisionStoreOptions {
  backend?: DecisionStoreBackend;
  supabaseTableName?: string;
  postgresConnectionString?: string;
  warehouseDatasetName?: string;
}

// The single place that decides which DecisionKnowledgeStore
// implementation to use — mirrors the other four platforms' own
// createStore.ts. Callers depend on this factory (and the
// DecisionKnowledgeStore interface it returns), never on a specific
// class.
export function createStore(options: CreateDecisionStoreOptions = {}): DecisionKnowledgeStore {
  const backend = options.backend ?? "memory";

  switch (backend) {
    case "memory":
      return new MemoryDecisionStore();
    case "supabase":
      return new SupabaseDecisionStore(options.supabaseTableName);
    case "postgres":
      return new PostgresDecisionStore(options.postgresConnectionString ?? "");
    case "warehouse":
      return new KnowledgeWarehouseDecisionStore(options.warehouseDatasetName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown decision store backend: ${exhaustiveCheck}`);
    }
  }
}
