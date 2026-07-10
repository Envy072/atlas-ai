import type { CacheEntry, ResearchCache } from "@/lib/research/types/cache";

// ARCHITECTURE ONLY. A future implementation would back this with a
// Supabase table (via the existing, unmodified lib/supabase.ts client) —
// useful for research results that should survive across server
// restarts/instances without adding a Redis dependency. Conforms to the
// same ResearchCache interface as memoryCache.ts/redisCache.ts.
export class DatabaseResearchCache implements ResearchCache {
  constructor(private readonly tableName: string = "research_cache") {}

  async get<TValue>(key: string): Promise<CacheEntry<TValue> | null> {
    void key;
    throw new Error(
      `DatabaseResearchCache is architecture only — no "${this.tableName}" table/query is implemented yet.`
    );
  }

  async set<TValue>(key: string, value: TValue, ttlSeconds?: number): Promise<void> {
    void key;
    void value;
    void ttlSeconds;
    throw new Error("DatabaseResearchCache.set is not implemented yet.");
  }

  async delete(key: string): Promise<void> {
    void key;
    throw new Error("DatabaseResearchCache.delete is not implemented yet.");
  }

  async clear(): Promise<void> {
    throw new Error("DatabaseResearchCache.clear is not implemented yet.");
  }
}
