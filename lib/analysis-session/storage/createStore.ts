import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";
import { MemoryAnalysisSessionStore } from "@/lib/analysis-session/storage/memoryStore";
import { SupabaseAnalysisSessionStore } from "@/lib/analysis-session/storage/supabaseStore";
import { PostgresAnalysisSessionStore } from "@/lib/analysis-session/storage/postgresStore";
import { KnowledgeWarehouseAnalysisSessionStore } from "@/lib/analysis-session/storage/warehouseStore";

export type AnalysisSessionStoreBackend = "memory" | "supabase" | "postgres" | "warehouse";

export interface CreateAnalysisSessionStoreOptions {
  backend?: AnalysisSessionStoreBackend;
  supabaseTableName?: string;
  postgresConnectionString?: string;
  warehouseDatasetName?: string;
}

// The single place that decides which AnalysisSessionStore
// implementation to use — mirrors every prior platform's own
// createStore.ts. Callers depend on this factory (and the
// AnalysisSessionStore interface it returns), never on a specific class.
export function createStore(
  options: CreateAnalysisSessionStoreOptions = {}
): AnalysisSessionStore {
  const backend = options.backend ?? "memory";

  switch (backend) {
    case "memory":
      return new MemoryAnalysisSessionStore();
    case "supabase":
      return new SupabaseAnalysisSessionStore(options.supabaseTableName);
    case "postgres":
      return new PostgresAnalysisSessionStore(options.postgresConnectionString ?? "");
    case "warehouse":
      return new KnowledgeWarehouseAnalysisSessionStore(options.warehouseDatasetName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown analysis session store backend: ${exhaustiveCheck}`);
    }
  }
}
