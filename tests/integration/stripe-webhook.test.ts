import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// Mirrors tests/integration/analysis-flags.test.ts's own established
// pattern: the subject under test is the real, unmodified route handler
// and the real, unmodified service (lib/services/stripe.ts) — only the
// lowest-level externals (the Stripe SDK, the Supabase admin client)
// are test doubles.

vi.mock("stripe", () => ({ default: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

// Mirrors lib/api/response.test.ts's own established Sentry-mocking
// pattern: mocked here (rather than left real/DSN-optional-no-op) so
// this file's own new Sentry-capture tests can assert the real
// capture-or-not decision deterministically.
const { captureExceptionMock } = vi.hoisted(() => ({ captureExceptionMock: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: captureExceptionMock }));

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
  captureExceptionMock.mockClear();
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

  it("golden path: a validly-signed invoice.payment_failed marks the subscription past_due", async () => {
    mockStripeConstructor(
      () =>
        ({
          type: "invoice.payment_failed",
          data: {
            object: {
              id: "in_test_1",
              customer: "cus_test_1",
              parent: { subscription_details: { subscription: "sub_test_1" } },
            },
          },
        }) as unknown as Stripe.Event
    );
    const maybeSingle = vi.fn(() => Promise.resolve({ data: { user_id: "user-1" }, error: null }));
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const updateEq = vi.fn(() => Promise.resolve({ error: null }));
    const update = vi.fn(() => ({ eq: updateEq }));
    mockedCreateAdminClient.mockReturnValue({ from: vi.fn(() => ({ select, update })) } as never);

    const response = await POST(buildRequest("{}", "valid-signature"));

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "past_due" }));
    expect(updateEq).toHaveBeenCalledWith("stripe_subscription_id", "sub_test_1");
  });

  it("rejects an invalid signature with 400, before any database call is attempted, and does not alert Sentry (an expected, routine rejection)", async () => {
    mockStripeConstructor(() => {
      throw new Error("No signatures found matching the expected signature for payload.");
    });

    const response = await POST(buildRequest("{}", "bad-signature"));

    expect(response.status).toBe(400);
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("acknowledges (200) an event type it doesn't handle, without touching the database", async () => {
    mockStripeConstructor(
      () => ({ type: "invoice.paid", data: { object: {} } }) as unknown as Stripe.Event
    );

    const response = await POST(buildRequest("{}", "valid-signature"));

    expect(response.status).toBe(200);
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });

  it("reports a genuine handler failure (e.g. a Supabase write error) to Sentry and returns a retryable status, unlike a routine signature rejection", async () => {
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
    const upsert = vi.fn(() => Promise.resolve({ error: { message: "connection lost" } }));
    mockedCreateAdminClient.mockReturnValue({ from: vi.fn(() => ({ upsert })) } as never);

    const response = await POST(buildRequest("{}", "valid-signature"));

    expect(response.status).toBe(502);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
