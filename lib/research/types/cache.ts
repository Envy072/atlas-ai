// A cache entry wraps whatever value is stored with the metadata needed
// to know if it's still fresh, independent of which backend holds it.
export interface CacheEntry<TValue> {
  value: TValue;
  storedAt: string;
  expiresAt: string | null;
}

// The one interface every cache backend (memory today; Redis/database
// later) implements. Callers (the orchestrator, eventually) depend only
// on this — swapping memory for Redis in production is a one-line change
// at the call site that constructs the cache, not a rewrite of anything
// that uses it.
export interface ResearchCache {
  get<TValue>(key: string): Promise<CacheEntry<TValue> | null>;
  set<TValue>(key: string, value: TValue, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
