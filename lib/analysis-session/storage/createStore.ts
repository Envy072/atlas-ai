import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";
import { MemoryAnalysisSessionStore } from "@/lib/analysis-session/storage/memoryStore";
import { createSupabaseAnalysisSessionStore } from "@/lib/analysis-session/storage/supabaseStore";

// Milestone 50 — the raw-Postgres and Warehouse backends were both
// always "ARCHITECTURE ONLY" (every method threw "not implemented
// yet"), had zero live callers anywhere, and were never the roadmap's
// chosen future direction (Supabase is) — retired, not replaced.
export type AnalysisSessionStoreBackend = "memory" | "supabase";

export interface CreateAnalysisSessionStoreOptions {
  backend?: AnalysisSessionStoreBackend;
  supabaseTableName?: string;
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
      return createSupabaseAnalysisSessionStore(options.supabaseTableName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown analysis session store backend: ${exhaustiveCheck}`);
    }
  }
}
