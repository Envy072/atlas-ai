// The one interface every rate-limit counter backend implements
// (Milestone 47) — mirrors lib/analysis-session/types/storage.ts's own
// AnalysisSessionStore pattern, so swapping the backend (e.g. to Redis,
// once real traffic justifies the lower latency) means writing one new
// class against this interface, never touching a route or
// checkRateLimit() itself.
export interface RateLimitStore {
  // Atomically increments the counter for one (bucketKey, windowStart)
  // pair and returns the count AFTER incrementing. Must be a single
  // atomic operation — a read-then-write here would let two concurrent
  // serverless invocations both observe "0" and both proceed, defeating
  // the limiter under real concurrent load.
  increment(bucketKey: string, windowStart: Date): Promise<number>;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
}
