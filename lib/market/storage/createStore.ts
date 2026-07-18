import type { MarketKnowledgeStore } from "@/lib/market/types/storage";
import { MemoryMarketStore } from "@/lib/market/storage/memoryStore";
import { SupabaseMarketStore } from "@/lib/market/storage/supabaseStore";

// Milestone 50 — the raw-Postgres and Warehouse backends were both
// always "ARCHITECTURE ONLY" (every method threw "not implemented
// yet"), had zero live callers anywhere, and were never the roadmap's
// chosen future direction (Supabase is) — retired, not replaced.
export type MarketStoreBackend = "memory" | "supabase";

export interface CreateMarketStoreOptions {
  backend?: MarketStoreBackend;
  supabaseTableName?: string;
}

// The single place that decides which MarketKnowledgeStore implementation
// to use — mirrors lib/competitors/storage/createStore.ts and
// lib/research/cache/createCache.ts. Callers depend on this factory (and
// the MarketKnowledgeStore interface it returns), never on a specific
// class.
export function createStore(options: CreateMarketStoreOptions = {}): MarketKnowledgeStore {
  const backend = options.backend ?? "memory";

  switch (backend) {
    case "memory":
      return new MemoryMarketStore();
    case "supabase":
      return new SupabaseMarketStore(options.supabaseTableName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown market store backend: ${exhaustiveCheck}`);
    }
  }
}
