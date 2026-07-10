import type { ResearchCache } from "@/lib/research/types/cache";
import { MemoryResearchCache } from "@/lib/research/cache/memoryCache";
import { RedisResearchCache } from "@/lib/research/cache/redisCache";
import { DatabaseResearchCache } from "@/lib/research/cache/databaseCache";

export type CacheBackend = "memory" | "redis" | "database";

export interface CreateCacheOptions {
  backend?: CacheBackend;
  redisConnectionUrl?: string;
  databaseTableName?: string;
}

// The single place that decides which ResearchCache implementation to
// use — callers depend on this factory (and the ResearchCache interface
// it returns), never on a specific class, so switching the default from
// memory to redis in production later is a one-line change here.
export function createCache(options: CreateCacheOptions = {}): ResearchCache {
  const backend = options.backend ?? "memory";

  switch (backend) {
    case "memory":
      return new MemoryResearchCache();
    case "redis":
      return new RedisResearchCache(options.redisConnectionUrl ?? "");
    case "database":
      return new DatabaseResearchCache(options.databaseTableName);
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown cache backend: ${exhaustiveCheck}`);
    }
  }
}
