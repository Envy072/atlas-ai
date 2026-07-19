import { describe, it, expect } from "vitest";
import {
  computeNextRefresh,
  determineRefreshPriority,
  buildRefreshMetadata,
  buildManualRefreshMetadata,
  isStale,
} from "@/lib/competitors/refresh/refreshPolicy";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

const MS_PER_DAY = 86_400_000;

// Milestone 52 — tests verify this file's actual, current behavior
// exactly as implemented, including its real boundary values
// (REFRESH_INTERVAL_DAYS, the confidence thresholds), not idealized or
// future behavior.
describe("determineRefreshPriority", () => {
  it("returns 'urgent' below 25", () => {
    expect(determineRefreshPriority(0)).toBe("urgent");
    expect(determineRefreshPriority(24)).toBe("urgent");
  });

  it("returns 'high' from 25 up to (not including) 50", () => {
    expect(determineRefreshPriority(25)).toBe("high");
    expect(determineRefreshPriority(49)).toBe("high");
  });

  it("returns 'normal' from 50 up to (not including) 75", () => {
    expect(determineRefreshPriority(50)).toBe("normal");
    expect(determineRefreshPriority(74)).toBe("normal");
  });

  it("returns 'low' at 75 and above", () => {
    expect(determineRefreshPriority(75)).toBe("low");
    expect(determineRefreshPriority(100)).toBe("low");
  });
});

describe("computeNextRefresh", () => {
  const from = new Date("2026-01-01T00:00:00.000Z");

  it("adds 1 day for urgent", () => {
    expect(computeNextRefresh(from, "urgent")).toBe(new Date(from.getTime() + 1 * MS_PER_DAY).toISOString());
  });

  it("adds 7 days for high", () => {
    expect(computeNextRefresh(from, "high")).toBe(new Date(from.getTime() + 7 * MS_PER_DAY).toISOString());
  });

  it("adds 30 days for normal", () => {
    expect(computeNextRefresh(from, "normal")).toBe(new Date(from.getTime() + 30 * MS_PER_DAY).toISOString());
  });

  it("adds 90 days for low", () => {
    expect(computeNextRefresh(from, "low")).toBe(new Date(from.getTime() + 90 * MS_PER_DAY).toISOString());
  });
});

describe("buildRefreshMetadata", () => {
  it("composes lastUpdated/nextRefresh/reason/priority from the given confidence", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildRefreshMetadata("scheduled", 10, now);

    expect(metadata.lastUpdated).toBe(now.toISOString());
    expect(metadata.refreshReason).toBe("scheduled");
    expect(metadata.refreshPriority).toBe("urgent");
    expect(metadata.nextRefresh).toBe(computeNextRefresh(now, "urgent"));
  });

  it("derives a different priority for a higher confidence", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildRefreshMetadata("initial_discovery", 80, now);

    expect(metadata.refreshPriority).toBe("low");
    expect(metadata.refreshReason).toBe("initial_discovery");
  });
});

describe("buildManualRefreshMetadata", () => {
  it("always returns urgent priority, reason 'manual', and nextRefresh equal to now", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildManualRefreshMetadata(now);

    expect(metadata.refreshPriority).toBe("urgent");
    expect(metadata.refreshReason).toBe("manual");
    expect(metadata.lastUpdated).toBe(now.toISOString());
    expect(metadata.nextRefresh).toBe(now.toISOString());
  });
});

function buildProfileWithNextRefresh(nextRefresh: string): CompanyProfile {
  return {
    id: "company_1",
    name: "Acme",
    aliases: [],
    features: [],
    technology: [],
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
    sources: [],
    evidence: [],
    confidence: 50,
    refresh: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      nextRefresh,
      refreshReason: "scheduled",
      refreshPriority: "normal",
    },
  };
}

describe("isStale", () => {
  it("is stale when nextRefresh is in the past", () => {
    const profile = buildProfileWithNextRefresh("2026-01-01T00:00:00.000Z");
    expect(isStale(profile, new Date("2026-01-02T00:00:00.000Z"))).toBe(true);
  });

  it("is stale exactly at the nextRefresh boundary (<=)", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const profile = buildProfileWithNextRefresh(now.toISOString());
    expect(isStale(profile, now)).toBe(true);
  });

  it("is not stale when nextRefresh is in the future", () => {
    const profile = buildProfileWithNextRefresh("2026-01-02T00:00:00.000Z");
    expect(isStale(profile, new Date("2026-01-01T00:00:00.000Z"))).toBe(false);
  });
});
