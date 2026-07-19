import { describe, it, expect } from "vitest";
import {
  requestManualRefresh,
  requestScheduledRefresh,
  requestStaleRefresh,
  collectStaleFinancials,
} from "@/lib/financial/refresh/financialRefreshEngine";
import { isFinancialStale } from "@/lib/financial/refresh/financialRefreshPolicy";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";

function buildProfile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
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
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "normal",
    },
    ...overrides,
  };
}

// Milestone 59 — verifies this file's actual, current behavior: each
// "request*" function replaces only a profile's `refresh` field, and
// collectStaleFinancials filters + sorts by refreshPriority urgency —
// mirrors lib/business's own financialRefreshEngine.test.ts pattern.
describe("requestManualRefresh", () => {
  it("always sets priority urgent, reason manual, and nextRefresh equal to now", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 90 });
    const result = requestManualRefresh(profile, now);

    expect(result.refresh.refreshReason).toBe("manual");
    expect(result.refresh.refreshPriority).toBe("urgent");
    expect(result.refresh.nextRefresh).toBe(now.toISOString());
  });

  it("leaves every other field on the profile unchanged", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 90 });
    const result = requestManualRefresh(profile, now);

    expect(result.confidence).toBe(90);
  });
});

describe("requestScheduledRefresh", () => {
  it("recomputes priority from the profile's own current confidence", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 10 });
    const result = requestScheduledRefresh(profile, now);

    expect(result.refresh.refreshReason).toBe("scheduled");
    expect(result.refresh.refreshPriority).toBe("urgent");
  });

  it("derives a different priority for a higher confidence", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 80 });
    const result = requestScheduledRefresh(profile, now);

    expect(result.refresh.refreshPriority).toBe("low");
  });
});

describe("requestStaleRefresh", () => {
  it("sets reason 'stale', with priority derived from confidence", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 30 });
    const result = requestStaleRefresh(profile, now);

    expect(result.refresh.refreshReason).toBe("stale");
    expect(result.refresh.refreshPriority).toBe("high");
  });
});

describe("collectStaleFinancials", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");

  it("excludes profiles whose nextRefresh is still in the future", () => {
    const fresh = buildProfile({
      id: "fresh",
      refresh: { ...buildProfile().refresh, nextRefresh: "2026-03-01T00:00:00.000Z" },
    });
    expect(isFinancialStale(fresh, now)).toBe(false);

    expect(collectStaleFinancials([fresh], now)).toEqual([]);
  });

  it("includes only stale profiles, ordered most-urgent first", () => {
    const stalePastDue = (id: string, priority: FinancialProfile["refresh"]["refreshPriority"]): FinancialProfile =>
      buildProfile({
        id,
        refresh: {
          lastUpdated: "2026-01-01T00:00:00.000Z",
          nextRefresh: "2026-01-01T00:00:00.000Z",
          refreshReason: "scheduled",
          refreshPriority: priority,
        },
      });

    const normal = stalePastDue("normal_financial", "normal");
    const urgent = stalePastDue("urgent_financial", "urgent");
    const low = stalePastDue("low_financial", "low");
    const high = stalePastDue("high_financial", "high");

    const result = collectStaleFinancials([normal, urgent, low, high], now);

    expect(result.map((profile) => profile.id)).toEqual([
      "urgent_financial",
      "high_financial",
      "normal_financial",
      "low_financial",
    ]);
  });
});
