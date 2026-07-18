import { describe, it, expect, vi } from "vitest";
import { checkRateLimit } from "@/lib/services/rateLimit/checkRateLimit";
import type { RateLimitStore } from "@/lib/services/rateLimit/types";

// A fake, in-memory RateLimitStore — checkRateLimit()'s own logic
// (window computation, comparing a count to a configured limit) is the
// subject under test here, not any real backend's I/O. The Supabase
// backend's own behavior is covered separately
// (storage/supabaseStore.test.ts).
function fakeStore(): RateLimitStore {
  const counts = new Map<string, number>();
  return {
    increment: vi.fn(async (bucketKey: string, windowStart: Date) => {
      const key = `${bucketKey}@${windowStart.toISOString()}`;
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    }),
  };
}

describe("checkRateLimit", () => {
  it("allows a request under the configured limit", async () => {
    const result = await checkRateLimit("analysis:create", "ip:1.2.3.4", "anonymous", fakeStore());

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(2);
  });

  it("blocks a request once the configured limit is exceeded", async () => {
    const store = fakeStore();

    await checkRateLimit("analysis:create", "ip:1.2.3.4", "anonymous", store);
    await checkRateLimit("analysis:create", "ip:1.2.3.4", "anonymous", store);
    await checkRateLimit("analysis:create", "ip:1.2.3.4", "anonymous", store);
    const fourth = await checkRateLimit("analysis:create", "ip:1.2.3.4", "anonymous", store);

    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("tracks separate identities under separate buckets", async () => {
    const store = fakeStore();

    await checkRateLimit("analysis:create", "ip:1.1.1.1", "anonymous", store);
    await checkRateLimit("analysis:create", "ip:1.1.1.1", "anonymous", store);
    await checkRateLimit("analysis:create", "ip:1.1.1.1", "anonymous", store);
    const stillFirstIp = await checkRateLimit("analysis:create", "ip:1.1.1.1", "anonymous", store);
    const secondIp = await checkRateLimit("analysis:create", "ip:2.2.2.2", "anonymous", store);

    expect(stillFirstIp.allowed).toBe(false);
    expect(secondIp.allowed).toBe(true);
  });

  it("applies a higher limit for a Founder tier than an anonymous caller on the same bucket", async () => {
    const store = fakeStore();

    const anonymous = await checkRateLimit("analysis:create", "ip:1.2.3.4", "anonymous", store);
    const founder = await checkRateLimit("analysis:create", "user:founder-1", "founder", store);

    expect(anonymous.limit).toBe(3);
    expect(founder.limit).toBe(30);
  });

  it("throws for a (limitKey, tier) combination with no configured rule", async () => {
    await expect(checkRateLimit("billing:portal", "ip:1.2.3.4", "anonymous", fakeStore())).rejects.toThrow(
      'No rate limit rule configured for "billing:portal" at tier "anonymous".'
    );
  });
});
