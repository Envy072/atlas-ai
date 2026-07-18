import type { BusinessKnowledgeStore } from "@/lib/business/types/storage";
import { MemoryBusinessStore } from "@/lib/business/storage/memoryStore";
import { SupabaseBusinessStore } from "@/lib/business/storage/supabaseStore";

// Milestone 50 — the raw-Postgres and Warehouse backends were both
// always "ARCHITECTURE ONLY" (every method threw "not implemented
// yet"), had zero live callers anywhere, and were never the roadmap's
// chosen future direction (Supabase is) — retired, not replaced.
export type BusinessStoreBackend = "memory" | "supabase";

export interface CreateBusinessStoreOptions {
  backend?: BusinessStoreBackend;
  supabaseTableName?: string;
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
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown business store backend: ${exhaustiveCheck}`);
    }
  }
}
