import type { MarketKnowledgeStore } from "@/lib/market/types/storage";
import { MemoryMarketStore } from "@/lib/market/storage/memoryStore";
import { SupabaseMarketStore } from "@/lib/market/storage/supabaseStore";
import { PostgresMarketStore } from "@/lib/market/storage/postgresStore";
import { AnalyticalWarehouseMarketStore } from "@/lib/market/storage/warehouseStore";

export type MarketStoreBackend = "memory" | "supabase" | "postgres" | "warehouse";

export interface CreateMarketStoreOptions {
  backend?: MarketStoreBackend;
  supabaseTableName?: string;
  postgresConnectionString?: string;
  warehouseDatasetName?: string;
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
    case "postgres":
      return new PostgresMarketStore(options.postgresConnectionString ?? "");
    case "warehouse":
      return new AnalyticalWarehouseMarketStore(options.warehouseDatasetName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown market store backend: ${exhaustiveCheck}`);
    }
  }
}
