import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatScore,
  formatDisplayName,
  getSafeRedirectPath,
  formatPercent,
  formatCurrencyUsd,
  formatRelativeTime,
} from "@/lib/format";

describe("formatScore", () => {
  it("formats against the default max of 100", () => {
    expect(formatScore(72)).toBe("72/100");
  });

  it("formats against a custom max", () => {
    expect(formatScore(3, 5)).toBe("3/5");
  });
});

describe("formatDisplayName", () => {
  it("returns the local part of a normal email", () => {
    expect(formatDisplayName("eshagy7@gmail.com")).toBe("eshagy7");
  });

  it("falls back to the full email when the local part is empty", () => {
    expect(formatDisplayName("@example.com")).toBe("@example.com");
  });
});

// getSafeRedirectPath is the open-redirect guard MILESTONE_28_DESIGN.md
// introduced for /login and /signup — never automatically re-verified
// since (MILESTONE_30_DESIGN.md Deliverable 6).
describe("getSafeRedirectPath", () => {
  it("returns a genuine, same-origin relative path unchanged", () => {
    expect(getSafeRedirectPath("/dashboard", "/fallback")).toBe("/dashboard");
  });

  it("falls back when the path is null", () => {
    expect(getSafeRedirectPath(null, "/fallback")).toBe("/fallback");
  });

  it("falls back when the path is empty", () => {
    expect(getSafeRedirectPath("", "/fallback")).toBe("/fallback");
  });

  it("rejects a protocol-relative path (//)", () => {
    expect(getSafeRedirectPath("//evil.com", "/fallback")).toBe("/fallback");
  });

  it("rejects a backslash-normalization bypass (/\\)", () => {
    expect(getSafeRedirectPath("/\\evil.com", "/fallback")).toBe("/fallback");
  });

  it("rejects a path smuggling an absolute URL via ://", () => {
    expect(getSafeRedirectPath("/redirect?next=http://evil.com", "/fallback")).toBe("/fallback");
  });
});

describe("formatPercent", () => {
  it("appends a percent sign", () => {
    expect(formatPercent(50)).toBe("50%");
  });
});

describe("formatCurrencyUsd", () => {
  it("formats billions compactly", () => {
    expect(formatCurrencyUsd(1_200_000_000)).toBe("$1.2B");
  });

  it("formats millions compactly", () => {
    expect(formatCurrencyUsd(2_500_000)).toBe("$2.5M");
  });

  it("formats a small figure without a compact suffix", () => {
    // Below the compact (K/M/B) threshold, ICU implementations
    // genuinely disagree on whether to print a trailing ".0" for
    // maximumFractionDigits: 1 — confirmed directly via a real CI
    // failure (Node's bundled ICU/CLDR data differs by version): this
    // machine's Node produced "$500", GitHub Actions' Node produced
    // "$500.0". Both are correct, ICU-version-dependent renderings of
    // the same value, so the assertion accepts either rather than
    // hardcoding one environment's output. The million/billion cases
    // above are unaffected — compact notation always uses a fractional
    // digit once a K/M/B suffix applies, so there's nothing ambiguous
    // to tolerate there.
    expect(formatCurrencyUsd(500)).toMatch(/^\$500(\.0)?$/);
  });
});

// A fixed system time (vi.setSystemTime) is required here — without it
// this suite would be flaky by construction, since formatRelativeTime
// reads Date.now() internally (MILESTONE_30_DESIGN.md Risks, "Flaky
// tests").
describe("formatRelativeTime", () => {
  const NOW = new Date("2026-07-15T12:00:00.000Z");

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats a few seconds in the past", () => {
    vi.setSystemTime(NOW);
    const past = new Date(NOW.getTime() - 30_000).toISOString();
    expect(formatRelativeTime(past)).toBe("30 seconds ago");
  });

  it("formats a couple hours in the past", () => {
    vi.setSystemTime(NOW);
    const past = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(past)).toBe("2 hours ago");
  });

  it("formats a few minutes in the future", () => {
    vi.setSystemTime(NOW);
    const future = new Date(NOW.getTime() + 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(future)).toBe("in 5 minutes");
  });

  it("formats a few days in the past", () => {
    vi.setSystemTime(NOW);
    const past = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(past)).toBe("3 days ago");
  });
});
