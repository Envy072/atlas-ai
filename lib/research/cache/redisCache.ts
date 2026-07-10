import type { CacheEntry, ResearchCache } from "@/lib/research/types/cache";

// ARCHITECTURE ONLY — per this milestone's explicit rule ("Do NOT
// implement Redis"), this conforms to the ResearchCache interface but
// does not connect to anything. A real implementation later (using
// `ioredis` or `@upstash/redis`, neither of which is a dependency yet)
// only needs to fill in these four methods — every caller already
// depends on the ResearchCache interface, not on this class.
export class RedisResearchCache implements ResearchCache {
  constructor(private readonly connectionUrl: string) {}

  async get<TValue>(key: string): Promise<CacheEntry<TValue> | null> {
    void key;
    throw new Error(
      `RedisResearchCache is architecture only — no Redis client is connected yet (would target ${this.connectionUrl}).`
    );
  }

  async set<TValue>(key: string, value: TValue, ttlSeconds?: number): Promise<void> {
    void key;
    void value;
    void ttlSeconds;
    throw new Error("RedisResearchCache.set is not implemented yet.");
  }

  async delete(key: string): Promise<void> {
    void key;
    throw new Error("RedisResearchCache.delete is not implemented yet.");
  }

  async clear(): Promise<void> {
    throw new Error("RedisResearchCache.clear is not implemented yet.");
  }
}
