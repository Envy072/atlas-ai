import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";
import { SupabaseRateLimitStore } from "@/lib/services/rateLimit/storage/supabaseStore";
import { ExternalServiceError } from "@/lib/errors";

const mockedCreateClient = vi.mocked(createClient);

beforeEach(() => {
  mockedCreateClient.mockReset();
});

describe("SupabaseRateLimitStore", () => {
  it("calls increment_rate_limit_bucket with the exact bucket key and window, returning the new count", async () => {
    const client = createMockSupabaseClient({ rpcResult: { data: 4, error: null } });
    mockedCreateClient.mockResolvedValue(client);

    const store = new SupabaseRateLimitStore();
    const windowStart = new Date("2026-07-18T00:00:00.000Z");
    const count = await store.increment("analysis:create:ip:1.2.3.4", windowStart);

    expect(count).toBe(4);
    expect(client.rpc).toHaveBeenCalledWith("increment_rate_limit_bucket", {
      p_bucket_key: "analysis:create:ip:1.2.3.4",
      p_window_start: windowStart.toISOString(),
    });
  });

  it("throws ExternalServiceError when the increment RPC itself fails", async () => {
    const client = createMockSupabaseClient({
      rpcResult: { data: null, error: { message: "connection refused" } },
    });
    mockedCreateClient.mockResolvedValue(client);

    const store = new SupabaseRateLimitStore();

    await expect(store.increment("analysis:create:ip:1.2.3.4", new Date())).rejects.toThrow(ExternalServiceError);
  });
});
