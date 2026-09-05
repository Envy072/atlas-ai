import { describe, it, expect, vi, beforeEach } from "vitest";

// getUserTier()'s own internal correctness (Supabase read, tier
// resolution) is already covered by lib/services/stripe.test.ts — mocked
// here so this file stays focused on its actual subject: how
// resolveCallerContext() composes a caller's identity/tier for the rate
// limiter, matching tests/integration/analysis-sessions.test.ts's own
// established mocking convention for this exact function.
vi.mock("@/lib/services/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/stripe")>();
  return { ...actual, getUserTier: vi.fn() };
});

import { getUserTier } from "@/lib/services/stripe";
import { getClientIp, resolveCallerContext } from "@/lib/api/clientIdentity";

const mockedGetUserTier = vi.mocked(getUserTier);

beforeEach(() => {
  mockedGetUserTier.mockReset();
});

function buildRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/analysis-sessions", { headers });
}

describe("getClientIp", () => {
  it("extracts the first address from a comma-separated x-forwarded-for header", () => {
    const req = buildRequest({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("trims surrounding whitespace from the first address", () => {
    const req = buildRequest({ "x-forwarded-for": " 203.0.113.5 , 70.41.3.18" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to a fixed sentinel when the header is absent, rather than throwing", () => {
    expect(getClientIp(buildRequest())).toBe("unknown");
  });
});

describe("resolveCallerContext", () => {
  it("resolves an anonymous caller to tier 'anonymous' and an ip-based identity", async () => {
    const req = buildRequest({ "x-forwarded-for": "203.0.113.5" });

    const context = await resolveCallerContext(req, null);

    expect(context).toEqual({ tier: "anonymous", identity: "ip:203.0.113.5" });
    expect(mockedGetUserTier).not.toHaveBeenCalled();
  });

  it("resolves a signed-in caller's tier via getUserTier() and a user-based identity", async () => {
    mockedGetUserTier.mockResolvedValue("founder");
    const req = buildRequest();

    const context = await resolveCallerContext(req, { id: "user-1" });

    expect(context).toEqual({ tier: "founder", identity: "user:user-1" });
    expect(mockedGetUserTier).toHaveBeenCalledWith("user-1");
  });
});
