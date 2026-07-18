import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";
import { MemoryCompetitorStore } from "@/lib/competitors/storage/memoryStore";
import { SupabaseCompetitorStore } from "@/lib/competitors/storage/supabaseStore";
import { VectorDbCompetitorStore } from "@/lib/competitors/storage/vectorStore";

// Milestone 50 — the raw-Postgres backend was "ARCHITECTURE ONLY"
// (every method threw "not implemented yet"), had zero live callers
// anywhere, and was never the roadmap's chosen future direction
// (Supabase is) — retired, not replaced. "vector" is untouched: a
// different, still-intended future capability (semantic search) the
// roadmap's own "retiring raw Postgres and the speculative Warehouse
// variant" scope doesn't name.
export type CompetitorStoreBackend = "memory" | "supabase" | "vector";

export interface CreateStoreOptions {
  backend?: CompetitorStoreBackend;
  supabaseTableName?: string;
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
    case "vector":
      return new VectorDbCompetitorStore(options.vectorCollectionName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown competitor store backend: ${exhaustiveCheck}`);
    }
  }
}
