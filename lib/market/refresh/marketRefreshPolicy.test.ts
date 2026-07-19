import { describe, it, expect } from "vitest";
import {
  buildMarketRefreshMetadata,
  buildManualMarketRefreshMetadata,
  isMarketStale,
} from "@/lib/market/refresh/marketRefreshPolicy";
import { computeNextRefresh, determineRefreshPriority } from "@/lib/competitors";
import type { MarketProfile } from "@/lib/market/schemas/market.schema";

// Milestone 61 — verifies this file's actual, current behavior, including
// its cross-platform delegation to lib/competitors' own
// computeNextRefresh/determineRefreshPriority — the same pattern already
// observed for lib/business's and lib/financial's own refresh policies,
// not re-analyzed here.
describe("buildMarketRefreshMetadata", () => {
  it("composes lastUpdated/nextRefresh/reason/priority from the given confidence", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildMarketRefreshMetadata("scheduled", 10, now);

    expect(metadata.lastUpdated).toBe(now.toISOString());
    expect(metadata.refreshReason).toBe("scheduled");
    expect(metadata.refreshPriority).toBe(determineRefreshPriority(10));
    expect(metadata.nextRefresh).toBe(computeNextRefresh(now, determineRefreshPriority(10)));
  });

  it("derives a different priority for a higher confidence", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildMarketRefreshMetadata("initial_discovery", 80, now);

    expect(metadata.refreshPriority).toBe(determineRefreshPriority(80));
    expect(metadata.refreshReason).toBe("initial_discovery");
  });
});

describe("buildManualMarketRefreshMetadata", () => {
  it("always returns urgent priority, reason 'manual', and nextRefresh equal to now", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildManualMarketRefreshMetadata(now);

    expect(metadata.refreshPriority).toBe("urgent");
    expect(metadata.refreshReason).toBe("manual");
    expect(metadata.lastUpdated).toBe(now.toISOString());
    expect(metadata.nextRefresh).toBe(now.toISOString());
  });
});

function buildProfileWithNextRefresh(nextRefresh: string): MarketProfile {
  return {
    id: "market_1",
    industry: "saas",
    sizing: { tam: {}, sam: {}, som: {} },
    customerSegments: [],
    geographicMarkets: [],
    regulations: [],
    risks: [],
    trends: [],
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

describe("isMarketStale", () => {
  it("is stale when nextRefresh is in the past", () => {
    const profile = buildProfileWithNextRefresh("2026-01-01T00:00:00.000Z");
    expect(isMarketStale(profile, new Date("2026-01-02T00:00:00.000Z"))).toBe(true);
  });

  it("is stale exactly at the nextRefresh boundary (<=)", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const profile = buildProfileWithNextRefresh(now.toISOString());
    expect(isMarketStale(profile, now)).toBe(true);
  });

  it("is not stale when nextRefresh is in the future", () => {
    const profile = buildProfileWithNextRefresh("2026-01-02T00:00:00.000Z");
    expect(isMarketStale(profile, new Date("2026-01-01T00:00:00.000Z"))).toBe(false);
  });
});
