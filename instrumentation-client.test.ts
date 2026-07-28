import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Milestone 121 — the browser counterpart to instrumentation.test.ts.
// Mocked for the same reason: assert this file's own wiring without a
// real Sentry project or DSN.
const { initMock } = vi.hoisted(() => ({ initMock: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ init: initMock }));

describe("instrumentation-client", () => {
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

  it("initializes Sentry with the DSN read from the environment as soon as the module is imported", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://example@o0.ingest.sentry.io/0";

    await import("@/instrumentation-client");

    expect(initMock).toHaveBeenCalledWith({ dsn: "https://example@o0.ingest.sentry.io/0" });
  });

  it("still initializes with an undefined dsn when none is configured — the SDK's own documented no-op, never a thrown error", async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;

    await expect(import("@/instrumentation-client")).resolves.toBeDefined();
    expect(initMock).toHaveBeenCalledWith({ dsn: undefined });
  });
});
