import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";
import { MemoryCompetitorStore } from "@/lib/competitors/storage/memoryStore";
import { SupabaseCompetitorStore } from "@/lib/competitors/storage/supabaseStore";
import { PostgresCompetitorStore } from "@/lib/competitors/storage/postgresStore";
import { VectorDbCompetitorStore } from "@/lib/competitors/storage/vectorStore";

export type CompetitorStoreBackend = "memory" | "supabase" | "postgres" | "vector";

export interface CreateStoreOptions {
  backend?: CompetitorStoreBackend;
  supabaseTableName?: string;
  postgresConnectionString?: string;
  vectorCollectionName?: string;
}

// The single place that decides which CompetitorKnowledgeStore
// implementation to use — mirrors lib/research/cache/createCache.ts.
// Callers depend on this factory (and the CompetitorKnowledgeStore
// interface it returns), never on a specific class, so switching the
// default from memory to Supabase in production later is a one-line
// change here.
export function createStore(options: CreateStoreOptions = {}): CompetitorKnowledgeStore {
  const backend = options.backend ?? "memory";

  switch (backend) {
    case "memory":
      return new MemoryCompetitorStore();
    case "supabase":
      return new SupabaseCompetitorStore(options.supabaseTableName);
    case "postgres":
      return new PostgresCompetitorStore(options.postgresConnectionString ?? "");
    case "vector":
      return new VectorDbCompetitorStore(options.vectorCollectionName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown competitor store backend: ${exhaustiveCheck}`);
    }
  }
}
