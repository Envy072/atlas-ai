import type { DecisionKnowledgeStore } from "@/lib/decision/types/storage";
import { MemoryDecisionStore } from "@/lib/decision/storage/memoryStore";
import { SupabaseDecisionStore } from "@/lib/decision/storage/supabaseStore";

// Milestone 50 — the raw-Postgres and Warehouse backends were both
// always "ARCHITECTURE ONLY" (every method threw "not implemented
// yet"), had zero live callers anywhere, and were never the roadmap's
// chosen future direction (Supabase is) — retired, not replaced.
export type DecisionStoreBackend = "memory" | "supabase";

export interface CreateDecisionStoreOptions {
  backend?: DecisionStoreBackend;
  supabaseTableName?: string;
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
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown decision store backend: ${exhaustiveCheck}`);
    }
  }
}
