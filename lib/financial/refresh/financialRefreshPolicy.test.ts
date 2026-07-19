import { describe, it, expect } from "vitest";
import {
  buildFinancialRefreshMetadata,
  buildManualFinancialRefreshMetadata,
  isFinancialStale,
} from "@/lib/financial/refresh/financialRefreshPolicy";
import { computeNextRefresh, determineRefreshPriority } from "@/lib/competitors";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";

// Milestone 58 — verifies this file's actual, current behavior, including
// its deliberate cross-platform delegation to lib/competitors' own
// computeNextRefresh/determineRefreshPriority — the same pattern already
// identified and tested for lib/business's own refresh policy (M55), not
// re-analyzed here.
describe("buildFinancialRefreshMetadata", () => {
  it("composes lastUpdated/nextRefresh/reason/priority from the given confidence", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildFinancialRefreshMetadata("scheduled", 10, now);

    expect(metadata.lastUpdated).toBe(now.toISOString());
    expect(metadata.refreshReason).toBe("scheduled");
    expect(metadata.refreshPriority).toBe(determineRefreshPriority(10));
    expect(metadata.nextRefresh).toBe(computeNextRefresh(now, determineRefreshPriority(10)));
  });

  it("derives a different priority for a higher confidence", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildFinancialRefreshMetadata("initial_discovery", 80, now);

    expect(metadata.refreshPriority).toBe(determineRefreshPriority(80));
    expect(metadata.refreshReason).toBe("initial_discovery");
  });
});

describe("buildManualFinancialRefreshMetadata", () => {
  it("always returns urgent priority, reason 'manual', and nextRefresh equal to now", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildManualFinancialRefreshMetadata(now);

    expect(metadata.refreshPriority).toBe("urgent");
    expect(metadata.refreshReason).toBe("manual");
    expect(metadata.lastUpdated).toBe(now.toISOString());
    expect(metadata.nextRefresh).toBe(now.toISOString());
  });
});

function buildProfileWithNextRefresh(nextRefresh: string): FinancialProfile {
  return {
    id: "financial_1",
    grossMargin: {},
    operatingMargin: {},
    burnRate: {},
    runway: {},
    breakEven: {},
    cac: {},
    ltv: {},
    ltvToCac: {},
    mrr: {},
    arr: {},
    paybackPeriod: {},
    revenueStreams: [],
    expenses: [],
    financialRisks: [],
    financialAssumptions: [],
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

describe("isFinancialStale", () => {
  it("is stale when nextRefresh is in the past", () => {
    const profile = buildProfileWithNextRefresh("2026-01-01T00:00:00.000Z");
    expect(isFinancialStale(profile, new Date("2026-01-02T00:00:00.000Z"))).toBe(true);
  });

  it("is stale exactly at the nextRefresh boundary (<=)", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const profile = buildProfileWithNextRefresh(now.toISOString());
    expect(isFinancialStale(profile, now)).toBe(true);
  });

  it("is not stale when nextRefresh is in the future", () => {
    const profile = buildProfileWithNextRefresh("2026-01-02T00:00:00.000Z");
    expect(isFinancialStale(profile, new Date("2026-01-01T00:00:00.000Z"))).toBe(false);
  });
});
