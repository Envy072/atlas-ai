import type { CacheEntry, ResearchCache } from "@/lib/research/types/cache";

// A genuinely working cache — no external dependency needed for an
// in-process Map, so unlike the provider/ranking placeholders, this one
// is real. Suitable for local development and single-instance deploys;
// see redisCache.ts/databaseCache.ts for the multi-instance story.
export class MemoryResearchCache implements ResearchCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async get<TValue>(key: string): Promise<CacheEntry<TValue> | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.parse(entry.expiresAt) < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry as CacheEntry<TValue>;
  }

  async set<TValue>(key: string, value: TValue, ttlSeconds?: number): Promise<void> {
    const storedAt = new Date();
    const expiresAt = ttlSeconds ? new Date(storedAt.getTime() + ttlSeconds * 1000) : null;

    this.store.set(key, {
      value,
      storedAt: storedAt.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
