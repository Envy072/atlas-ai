import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// lib/services/stripe.ts's first-ever automated tests (MILESTONE_44_DESIGN.md
// Testing Strategy). Mocks the Stripe SDK client itself — the one layer
// this file owns, mirroring openai.test.ts's own "mock the SDK, never a
// real network call" convention — plus lib/supabase/admin.ts and
// lib/supabase/server.ts, substituted for the same "no request-scoped
// context under plain Vitest execution" reason projects.test.ts already
// documents.

vi.mock("stripe", () => ({ default: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import StripeSdk from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  constructWebhookEvent,
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  getUserTier,
} from "@/lib/services/stripe";
import { WebhookVerificationError } from "@/lib/errors";

const mockedStripeSdk = vi.mocked(StripeSdk);
const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedCreateClient = vi.mocked(createClient);

// Real code calls `new Stripe(secretKey)` — a plain arrow function
// passed to mockImplementation cannot be invoked with `new`, so this
// must be a real `function` expression (openai.test.ts's own established
// reason for the identical pattern).
function mockStripeConstructor(constructEvent: (...args: unknown[]) => Stripe.Event): void {
  mockedStripeSdk.mockImplementation(function mockConstructor() {
    return { webhooks: { constructEvent } } as unknown as StripeSdk;
  } as unknown as typeof StripeSdk);
}

interface MockAdminClientOptions {
  upsertResult?: { error: { message: string } | null };
  selectResult?: { data: Record<string, unknown> | null; error: { message: string } | null };
  updateResult?: { error: { message: string } | null };
}

// A small, local, purpose-built mock — deliberately not an extension of
// tests/mocks/supabaseClient.ts, whose own call chains (order/
// maybeSingle for projects.ts) don't overlap enough with this file's
// (upsert/update, both keyed by a single .eq()) to justify sharing one
// increasingly-branchy mock across both (MILESTONE_44_DESIGN.md
// Self-Review — the same "don't force an abstraction that doesn't
// clearly reduce complexity" judgment call).
function createMockAdminClient(options: MockAdminClientOptions = {}) {
  const upsertResult = options.upsertResult ?? { error: null };
  const selectResult = options.selectResult ?? { data: null, error: null };
  const updateResult = options.updateResult ?? { error: null };

  const upsert = vi.fn(() => Promise.resolve(upsertResult));
  const maybeSingle = vi.fn(() => Promise.resolve(selectResult));
  const selectEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const updateEq = vi.fn(() => Promise.resolve(updateResult));
  const update = vi.fn(() => ({ eq: updateEq }));

  const from = vi.fn(() => ({ upsert, select, update }));

  return { from };
}

function buildCheckoutSessionCompletedEvent(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Event {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        client_reference_id: "user-1",
        customer: "cus_test_1",
        subscription: "sub_test_1",
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

function buildSubscriptionEvent(type: string, overrides: Partial<Stripe.Subscription> = {}): Stripe.Event {
  return {
    type,
    data: {
      object: {
        id: "sub_test_1",
        status: "active",
        customer: "cus_test_1",
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fake");
});

afterEach(() => {
  mockedStripeSdk.mockReset();
  mockedCreateAdminClient.mockReset();
  mockedCreateClient.mockReset();
  vi.unstubAllEnvs();
});

describe("constructWebhookEvent", () => {
  it("returns the constructed event on a valid signature", async () => {
    const fakeEvent = buildCheckoutSessionCompletedEvent();
    mockStripeConstructor(() => fakeEvent);

    const result = await constructWebhookEvent("raw-body", "valid-signature");

    expect(result).toBe(fakeEvent);
  });

  it("throws WebhookVerificationError on an invalid signature, never the raw Stripe error", async () => {
    mockStripeConstructor(() => {
      throw new Error("No signatures found matching the expected signature for payload.");
    });

    await expect(constructWebhookEvent("raw-body", "bad-signature")).rejects.toThrow(WebhookVerificationError);
  });
});

describe("handleCheckoutSessionCompleted", () => {
  it("upserts a founder/active row keyed on user_id, from the session's own fields", async () => {
    const client = createMockAdminClient();
    mockedCreateAdminClient.mockReturnValue(client as never);

    await handleCheckoutSessionCompleted(buildCheckoutSessionCompletedEvent());

    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    expect(fromReturn.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        tier: "founder",
        status: "active",
        stripe_customer_id: "cus_test_1",
        stripe_subscription_id: "sub_test_1",
      },
      { onConflict: "user_id" }
    );
  });

  it("logs and no-ops (never calls the database) when client_reference_id is missing", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = createMockAdminClient();
    mockedCreateAdminClient.mockReturnValue(client as never);

    await handleCheckoutSessionCompleted(buildCheckoutSessionCompletedEvent({ client_reference_id: null }));

    expect(client.from).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("throws ExternalServiceError when the upsert itself fails", async () => {
    const client = createMockAdminClient({ upsertResult: { error: { message: "connection lost" } } });
    mockedCreateAdminClient.mockReturnValue(client as never);

    await expect(handleCheckoutSessionCompleted(buildCheckoutSessionCompletedEvent())).rejects.toThrow(
      "Could not activate the Founder subscription."
    );
  });
});

describe("handleSubscriptionUpdated", () => {
  it("maps Stripe's active status onto this app's own 'active' and updates by stripe_subscription_id", async () => {
    const client = createMockAdminClient({ selectResult: { data: { user_id: "user-1" }, error: null } });
    mockedCreateAdminClient.mockReturnValue(client as never);

    await handleSubscriptionUpdated(buildSubscriptionEvent("customer.subscription.updated", { status: "active" }));

    const fromReturn = vi.mocked(client.from).mock.results[1]?.value;
    expect(fromReturn.update).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
  });

  it("maps past_due/unpaid/incomplete onto 'past_due'", async () => {
    const client = createMockAdminClient({ selectResult: { data: { user_id: "user-1" }, error: null } });
    mockedCreateAdminClient.mockReturnValue(client as never);

    await handleSubscriptionUpdated(buildSubscriptionEvent("customer.subscription.updated", { status: "past_due" }));

    const fromReturn = vi.mocked(client.from).mock.results[1]?.value;
    expect(fromReturn.update).toHaveBeenCalledWith(expect.objectContaining({ status: "past_due" }));
  });

  it("maps everything else (e.g. incomplete_expired, paused) onto 'canceled'", async () => {
    const client = createMockAdminClient({ selectResult: { data: { user_id: "user-1" }, error: null } });
    mockedCreateAdminClient.mockReturnValue(client as never);

    await handleSubscriptionUpdated(
      buildSubscriptionEvent("customer.subscription.updated", { status: "incomplete_expired" })
    );

    const fromReturn = vi.mocked(client.from).mock.results[1]?.value;
    expect(fromReturn.update).toHaveBeenCalledWith(expect.objectContaining({ status: "canceled" }));
  });

  it("logs and no-ops when no row matches this subscription id", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = createMockAdminClient({ selectResult: { data: null, error: null } });
    mockedCreateAdminClient.mockReturnValue(client as never);

    await handleSubscriptionUpdated(buildSubscriptionEvent("customer.subscription.updated"));

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe("handleSubscriptionDeleted", () => {
  it("sets status to canceled for the matching subscription id", async () => {
    const client = createMockAdminClient();
    mockedCreateAdminClient.mockReturnValue(client as never);

    await handleSubscriptionDeleted(buildSubscriptionEvent("customer.subscription.deleted"));

    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    expect(fromReturn.update).toHaveBeenCalledWith(expect.objectContaining({ status: "canceled" }));
    const updateReturn = vi.mocked(fromReturn.update).mock.results[0]?.value;
    expect(updateReturn.eq).toHaveBeenCalledWith("stripe_subscription_id", "sub_test_1");
  });
});

describe("getUserTier", () => {
  it("returns 'free' when no row exists", async () => {
    mockedCreateClient.mockResolvedValue(
      createMockAdminClient({ selectResult: { data: null, error: null } }) as never
    );

    expect(await getUserTier("user-1")).toBe("free");
  });

  it("returns 'free' when the row's status is not 'active'", async () => {
    mockedCreateClient.mockResolvedValue(
      createMockAdminClient({ selectResult: { data: { tier: "founder", status: "canceled" }, error: null } }) as never
    );

    expect(await getUserTier("user-1")).toBe("free");
  });

  it("returns 'founder' for an active founder row", async () => {
    mockedCreateClient.mockResolvedValue(
      createMockAdminClient({ selectResult: { data: { tier: "founder", status: "active" }, error: null } }) as never
    );

    expect(await getUserTier("user-1")).toBe("founder");
  });

  it("returns 'free' (not a throw) and logs when Supabase itself returns an error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedCreateClient.mockResolvedValue(
      createMockAdminClient({ selectResult: { data: null, error: { message: "connection lost" } } }) as never
    );

    expect(await getUserTier("user-1")).toBe("free");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
