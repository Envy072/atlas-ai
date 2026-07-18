import type { FinancialKnowledgeStore } from "@/lib/financial/types/storage";
import { MemoryFinancialStore } from "@/lib/financial/storage/memoryStore";
import { SupabaseFinancialStore } from "@/lib/financial/storage/supabaseStore";

// Milestone 50 — the raw-Postgres and Warehouse backends were both
// always "ARCHITECTURE ONLY" (every method threw "not implemented
// yet"), had zero live callers anywhere, and were never the roadmap's
// chosen future direction (Supabase is) — retired, not replaced.
export type FinancialStoreBackend = "memory" | "supabase";

export interface CreateFinancialStoreOptions {
  backend?: FinancialStoreBackend;
  supabaseTableName?: string;
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
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown financial store backend: ${exhaustiveCheck}`);
    }
  }
}
