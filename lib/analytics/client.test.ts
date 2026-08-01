import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Milestone 123 — mocked so these tests assert this file's own explicit
// no-op guard deterministically, without a real PostHog project.
const { initMock, captureMock, identifyMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  captureMock: vi.fn(),
  identifyMock: vi.fn(),
}));
vi.mock("posthog-js", () => ({
  default: { init: initMock, capture: captureMock, identify: identifyMock },
}));

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

describe("lib/analytics/client", () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
    identifyMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    }
  });

  describe("without a configured key", () => {
    it("never initializes posthog-js", async () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const { initAnalytics } = await import("@/lib/analytics/client");

      initAnalytics();

      expect(initMock).not.toHaveBeenCalled();
    });

    it("trackEvent is a harmless no-op, never throws", async () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const { initAnalytics, trackEvent } = await import("@/lib/analytics/client");

      initAnalytics();

      expect(() => trackEvent(ANALYTICS_EVENTS.LOGIN_COMPLETED)).not.toThrow();
      expect(captureMock).not.toHaveBeenCalled();
    });

    it("identifyUser is a harmless no-op, never throws", async () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const { initAnalytics, identifyUser } = await import("@/lib/analytics/client");

      initAnalytics();

      expect(() => identifyUser("user-1")).not.toThrow();
      expect(identifyMock).not.toHaveBeenCalled();
    });
  });

  describe("with a configured key", () => {
    it("initializes posthog-js with autocapture/pageview tracking explicitly disabled", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      const { initAnalytics } = await import("@/lib/analytics/client");

      initAnalytics();

      expect(initMock).toHaveBeenCalledTimes(1);
      const [key, options] = initMock.mock.calls[0];
      expect(key).toBe("phc_test_key");
      expect(options).toMatchObject({
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
      });
    });

    it("does not re-initialize on a second call (no duplicate init)", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      const { initAnalytics } = await import("@/lib/analytics/client");

      initAnalytics();
      initAnalytics();

      expect(initMock).toHaveBeenCalledTimes(1);
    });

    it("trackEvent forwards the event name and properties to posthog-js", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      const { initAnalytics, trackEvent } = await import("@/lib/analytics/client");

      initAnalytics();
      trackEvent(ANALYTICS_EVENTS.ANALYSIS_STARTED, { is_anonymous: true });

      expect(captureMock).toHaveBeenCalledWith("analysis_started", { is_anonymous: true });
    });

    it("identifyUser forwards only the user id, never PII, to posthog-js", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      const { initAnalytics, identifyUser } = await import("@/lib/analytics/client");

      initAnalytics();
      identifyUser("user-123");

      expect(identifyMock).toHaveBeenCalledWith("user-123");
      expect(identifyMock).toHaveBeenCalledTimes(1);
    });
  });
});
