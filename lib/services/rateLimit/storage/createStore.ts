import type { RateLimitStore } from "@/lib/services/rateLimit/types";
import { SupabaseRateLimitStore } from "@/lib/services/rateLimit/storage/supabaseStore";

export type RateLimitStoreBackend = "supabase";

export interface CreateRateLimitStoreOptions {
  backend?: RateLimitStoreBackend;
}

// The single place that decides which RateLimitStore implementation to
// use — mirrors lib/analysis-session/storage/createStore.ts's own
// factory shape. Only "supabase" exists today; adding a future "redis"
// backend (once real traffic justifies the lower latency) means adding
// one new case here and one new class implementing RateLimitStore —
// never touching checkRateLimit() or any route.
export function createStore(options: CreateRateLimitStoreOptions = {}): RateLimitStore {
  const backend = options.backend ?? "supabase";

  switch (backend) {
    case "supabase":
      return new SupabaseRateLimitStore();
    default: {
      const exhaustiveCheck: never = backend;
      throw new Error(`Unknown rate limit store backend: ${exhaustiveCheck}`);
    }
  }
}
