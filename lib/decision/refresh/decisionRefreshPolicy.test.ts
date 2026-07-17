import { describe, it, expect } from "vitest";
import { isDecisionStale } from "@/lib/decision";
import {
  buildDecisionRefreshMetadata,
  buildManualDecisionRefreshMetadata,
} from "@/lib/decision/refresh/decisionRefreshPolicy";
import { buildDecisionProfileFixture } from "@/tests/fixtures";

// isDecisionStale()/buildDecisionRefreshMetadata()/buildManualDecisionRefreshMetadata()'s
// first-ever automated tests — real, unmodified since Milestone 31, but
// never load-bearing for any user-visible behavior until Milestone 41's
// StaleAnalysisBadge became their first real caller. Mirrors the
// established pattern of testing a previously-unexercised function
// exactly when it gains a real caller (Milestones 37/38 did the same for
// buildRecommendation()/sortRecommendationsByPriority()).

const NOW = new Date("2026-07-24T00:00:00.000Z");

describe("isDecisionStale", () => {
  it("returns false when nextRefresh is in the future", () => {
    const profile = buildDecisionProfileFixture({
      refresh: {
        lastUpdated: "2026-07-01T00:00:00.000Z",
        nextRefresh: "2026-07-25T00:00:00.000Z",
        refreshReason: "initial_discovery",
        refreshPriority: "normal",
      },
    });

    expect(isDecisionStale(profile, NOW)).toBe(false);
  });

  it("returns true when nextRefresh is in the past", () => {
    const profile = buildDecisionProfileFixture({
      refresh: {
        lastUpdated: "2026-05-01T00:00:00.000Z",
        nextRefresh: "2026-05-31T00:00:00.000Z",
        refreshReason: "initial_discovery",
        refreshPriority: "normal",
      },
    });

    expect(isDecisionStale(profile, NOW)).toBe(true);
  });

  it("returns true at the exact boundary — nextRefresh equal to now (isDecisionStale uses <=)", () => {
    const profile = buildDecisionProfileFixture({
      refresh: {
        lastUpdated: "2026-06-24T00:00:00.000Z",
        nextRefresh: NOW.toISOString(),
        refreshReason: "initial_discovery",
        refreshPriority: "normal",
      },
    });

    expect(isDecisionStale(profile, NOW)).toBe(true);
  });

  it("returns false one millisecond before the boundary", () => {
    const profile = buildDecisionProfileFixture({
      refresh: {
        lastUpdated: "2026-06-24T00:00:00.000Z",
        nextRefresh: new Date(NOW.getTime() + 1).toISOString(),
        refreshReason: "initial_discovery",
        refreshPriority: "normal",
      },
    });

    expect(isDecisionStale(profile, NOW)).toBe(false);
  });
});

describe("buildDecisionRefreshMetadata", () => {
  it("selects refreshPriority from confidence via the shared lib/competitors policy", () => {
    const urgent = buildDecisionRefreshMetadata("initial_discovery", 10, NOW);
    const high = buildDecisionRefreshMetadata("initial_discovery", 40, NOW);
    const normal = buildDecisionRefreshMetadata("initial_discovery", 60, NOW);
    const low = buildDecisionRefreshMetadata("initial_discovery", 90, NOW);

    expect(urgent.refreshPriority).toBe("urgent");
    expect(high.refreshPriority).toBe("high");
    expect(normal.refreshPriority).toBe("normal");
    expect(low.refreshPriority).toBe("low");
  });

  it("computes nextRefresh as lastUpdated plus the priority's own interval (urgent = 1 day)", () => {
    const metadata = buildDecisionRefreshMetadata("initial_discovery", 10, NOW);

    expect(metadata.lastUpdated).toBe(NOW.toISOString());
    expect(metadata.nextRefresh).toBe("2026-07-25T00:00:00.000Z");
  });

  it("preserves the reason it was given", () => {
    const metadata = buildDecisionRefreshMetadata("scheduled", 60, NOW);

    expect(metadata.refreshReason).toBe("scheduled");
  });
});

describe("buildManualDecisionRefreshMetadata", () => {
  it("always jumps the queue: urgent priority, nextRefresh equal to now, reason manual", () => {
    const metadata = buildManualDecisionRefreshMetadata(NOW);

    expect(metadata).toEqual({
      lastUpdated: NOW.toISOString(),
      nextRefresh: NOW.toISOString(),
      refreshReason: "manual",
      refreshPriority: "urgent",
    });
  });
});
