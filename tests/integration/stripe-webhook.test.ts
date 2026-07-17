import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// Mirrors tests/integration/analysis-flags.test.ts's own established
// pattern: the subject under test is the real, unmodified route handler
// and the real, unmodified service (lib/services/stripe.ts) — only the
// lowest-level externals (the Stripe SDK, the Supabase admin client)
// are test doubles.

vi.mock("stripe", () => ({ default: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import StripeSdk from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "@/app/api/webhooks/stripe/route";

const mockedStripeSdk = vi.mocked(StripeSdk);
const mockedCreateAdminClient = vi.mocked(createAdminClient);

function mockStripeConstructor(constructEvent: (...args: unknown[]) => Stripe.Event): void {
  mockedStripeSdk.mockImplementation(function mockConstructor() {
    return { webhooks: { constructEvent } } as unknown as StripeSdk;
  } as unknown as typeof StripeSdk);
}

function buildRequest(rawBody: string, signature: string | null): Request {
  const headers: Record<string, string> = {};
  if (signature !== null) headers["stripe-signature"] = signature;

  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fake");
});

afterEach(() => {
  mockedStripeSdk.mockReset();
  mockedCreateAdminClient.mockReset();
  vi.unstubAllEnvs();
});

describe("POST /api/webhooks/stripe", () => {
  it("golden path: a validly-signed checkout.session.completed activates the subscription", async () => {
    mockStripeConstructor(
      () =>
        ({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_1",
              client_reference_id: "user-1",
              customer: "cus_test_1",
              subscription: "sub_test_1",
            },
          },
        }) as unknown as Stripe.Event
    );
    const upsert = vi.fn(() => Promise.resolve({ error: null }));
    mockedCreateAdminClient.mockReturnValue({ from: vi.fn(() => ({ upsert })) } as never);

    const response = await POST(buildRequest("{}", "valid-signature"));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", tier: "founder", status: "active" }),
      { onConflict: "user_id" }
    );
  });

  it("rejects an invalid signature with 400, before any database call is attempted", async () => {
    mockStripeConstructor(() => {
      throw new Error("No signatures found matching the expected signature for payload.");
    });

    const response = await POST(buildRequest("{}", "bad-signature"));

    expect(response.status).toBe(400);
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });

  it("acknowledges (200) an event type it doesn't handle, without touching the database", async () => {
    mockStripeConstructor(
      () => ({ type: "invoice.paid", data: { object: {} } }) as unknown as Stripe.Event
    );

    const response = await POST(buildRequest("{}", "valid-signature"));

    expect(response.status).toBe(200);
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });
});
