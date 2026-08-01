import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Milestone 123 — mocked so these tests assert this file's own explicit
// no-op guard and flush behavior deterministically, without a real
// PostHog project.
const { PostHogMock, captureMock, flushMock } = vi.hoisted(() => {
  const captureMock = vi.fn();
  const flushMock = vi.fn().mockResolvedValue(undefined);
  class FakePostHog {
    capture = captureMock;
    flush = flushMock;
  }
  const PostHogMock = vi.fn(FakePostHog);
  return { PostHogMock, captureMock, flushMock };
});
vi.mock("posthog-node", () => ({ PostHog: PostHogMock }));

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

describe("lib/analytics/server", () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  beforeEach(() => {
    PostHogMock.mockClear();
    captureMock.mockClear();
    flushMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    }
  });

  it("never constructs a PostHog client, and never throws, when no key is configured", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const { trackServerEvent } = await import("@/lib/analytics/server");

    await expect(trackServerEvent(ANALYTICS_EVENTS.CHECKOUT_COMPLETED, "user-1")).resolves.toBeUndefined();

    expect(PostHogMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("captures and flushes an event when a key is configured", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { trackServerEvent } = await import("@/lib/analytics/server");

    await trackServerEvent(ANALYTICS_EVENTS.PROJECT_OPENED, "user-1", { project_id: "project-1" });

    expect(captureMock).toHaveBeenCalledWith({
      distinctId: "user-1",
      event: "project_opened",
      properties: { project_id: "project-1" },
      uuid: undefined,
    });
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it("forwards a given uuid for redelivery-safe deduplication (e.g. a Stripe webhook event id)", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { trackServerEvent } = await import("@/lib/analytics/server");

    await trackServerEvent(ANALYTICS_EVENTS.CHECKOUT_COMPLETED, "user-1", undefined, "evt_stripe_123");

    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: "evt_stripe_123" })
    );
  });

  it("reuses the same client singleton across multiple calls rather than reconstructing it", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { trackServerEvent } = await import("@/lib/analytics/server");

    await trackServerEvent(ANALYTICS_EVENTS.LOGIN_COMPLETED, "user-1");
    await trackServerEvent(ANALYTICS_EVENTS.LOGIN_COMPLETED, "user-2");

    expect(PostHogMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledTimes(2);
  });
});
