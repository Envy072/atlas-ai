import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";

// Mirrors tests/integration/analysis-sessions.test.ts's own established
// pattern: the subject under test is the real, unmodified route handler
// composing auth, rate limiting, and the billing-portal-URL service call
// into the correct HTTP outcome — not a re-verification of
// createBillingPortalUrl()'s own Supabase/Stripe internals, which
// lib/services/stripe.test.ts already covers directly.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/stripe")>();
  return { ...actual, createBillingPortalUrl: vi.fn() };
});

vi.mock("@/lib/services/rateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/rateLimit")>();
  return { ...actual, checkRateLimit: vi.fn() };
});

// next/navigation's real redirect() throws a special internal signal
// Next.js's own runtime catches — meaningless under plain Vitest
// execution (no such runtime exists here). Mocked to a plain spy so this
// file can assert the real, production-relevant fact instead: was
// redirect() called, and with the correct URL.
const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { createClient } from "@/lib/supabase/server";
import { createBillingPortalUrl } from "@/lib/services/stripe";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";
import { InvalidRequestError } from "@/lib/errors";
import { GET } from "@/app/api/billing/portal/route";

const mockedCreateClient = vi.mocked(createClient);
const mockedCreateBillingPortalUrl = vi.mocked(createBillingPortalUrl);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);

const FAKE_USER: User = {
  id: "user-1",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

beforeEach(() => {
  mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
  mockedCreateBillingPortalUrl.mockReset();
  mockedCheckRateLimit.mockReset();
  mockedCheckRateLimit.mockResolvedValue({ allowed: true, limit: 100, remaining: 99 });
  redirectMock.mockClear();
});

function buildRequest(): Request {
  return new Request("http://localhost/api/billing/portal");
}

describe("GET /api/billing/portal", () => {
  it("golden path: a signed-in user is redirected to their real Stripe Billing Portal URL", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: FAKE_USER }));
    mockedCreateBillingPortalUrl.mockResolvedValue("https://billing.stripe.com/session/test_123");

    await GET(buildRequest());

    expect(mockedCreateBillingPortalUrl).toHaveBeenCalledWith(
      "user-1",
      "http://localhost/settings/billing"
    );
    expect(redirectMock).toHaveBeenCalledWith("https://billing.stripe.com/session/test_123");
  });

  it("rejects an anonymous caller with 401, never resolving a portal URL", async () => {
    const response = await GET(buildRequest());

    expect(response).not.toBeUndefined();
    expect(response!.status).toBe(401);
    expect(mockedCreateBillingPortalUrl).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects a signed-in caller who has exceeded the billing:portal rate limit with 429, never resolving a portal URL", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: FAKE_USER }));
    mockedCheckRateLimit.mockResolvedValue({ allowed: false, limit: 10, remaining: 0 });

    const response = await GET(buildRequest());

    expect(response).not.toBeUndefined();
    expect(response!.status).toBe(429);
    expect(mockedCreateBillingPortalUrl).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("surfaces the service's own error (no billing account on file) as its real documented status instead of redirecting", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: FAKE_USER }));
    mockedCreateBillingPortalUrl.mockRejectedValue(
      new InvalidRequestError("No billing account found for this user.")
    );

    const response = await GET(buildRequest());

    expect(response).not.toBeUndefined();
    expect(response!.status).toBe(400);
    const body = await response!.json();
    expect(body.error).toBe("No billing account found for this user.");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
