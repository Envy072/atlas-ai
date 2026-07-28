import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Milestone 121 — production error monitoring. Mocked so these tests
// assert instrumentation.ts's own wiring (does it call Sentry.init with
// the right dsn? does it forward onRequestError to the SDK's own
// captureRequestError?) without needing a real Sentry project or DSN —
// DSN-optional is this milestone's own explicit requirement.
const { initMock, captureRequestErrorMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  captureRequestErrorMock: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  init: initMock,
  captureRequestError: captureRequestErrorMock,
}));

describe("instrumentation", () => {
  const originalDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  beforeEach(() => {
    initMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalDsn === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_DSN = originalDsn;
    }
  });

  describe("register", () => {
    it("initializes Sentry with the DSN read from the environment", async () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = "https://example@o0.ingest.sentry.io/0";

      const { register } = await import("@/instrumentation");
      register();

      expect(initMock).toHaveBeenCalledWith({ dsn: "https://example@o0.ingest.sentry.io/0" });
    });

    it("still calls Sentry.init with an undefined dsn when none is configured — the SDK's own documented no-op, never a thrown error", async () => {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      const { register } = await import("@/instrumentation");

      expect(() => register()).not.toThrow();
      expect(initMock).toHaveBeenCalledWith({ dsn: undefined });
    });
  });

  describe("onRequestError", () => {
    it("is exactly Sentry's own captureRequestError — Next.js's native onRequestError hook forwarded, not reimplemented", async () => {
      const { onRequestError } = await import("@/instrumentation");
      expect(onRequestError).toBe(captureRequestErrorMock);
    });
  });
});
