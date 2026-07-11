import type { FinancialKnowledgeStore } from "@/lib/financial/types/storage";
import { MemoryFinancialStore } from "@/lib/financial/storage/memoryStore";
import { SupabaseFinancialStore } from "@/lib/financial/storage/supabaseStore";
import { PostgresFinancialStore } from "@/lib/financial/storage/postgresStore";
import { AnalyticalWarehouseFinancialStore } from "@/lib/financial/storage/warehouseStore";

export type FinancialStoreBackend = "memory" | "supabase" | "postgres" | "warehouse";

export interface CreateFinancialStoreOptions {
  backend?: FinancialStoreBackend;
  supabaseTableName?: string;
  postgresConnectionString?: string;
  warehouseDatasetName?: string;
}

// The single place that decides which FinancialKnowledgeStore
// implementation to use — mirrors lib/competitors' and lib/market's own
// createStore.ts. Callers depend on this factory (and the
// FinancialKnowledgeStore interface it returns), never on a specific
// class.
export function createStore(options: CreateFinancialStoreOptions = {}): FinancialKnowledgeStore {
  const backend = options.backend ?? "memory";

  switch (backend) {
    case "memory":
      return new MemoryFinancialStore();
    case "supabase":
      return new SupabaseFinancialStore(options.supabaseTableName);
    case "postgres":
      return new PostgresFinancialStore(options.postgresConnectionString ?? "");
    case "warehouse":
      return new AnalyticalWarehouseFinancialStore(options.warehouseDatasetName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown financial store backend: ${exhaustiveCheck}`);
    }
  }
}
