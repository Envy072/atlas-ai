import { describe, it, expect } from "vitest";
import {
  requestManualRefresh,
  requestScheduledRefresh,
  requestStaleRefresh,
  collectStaleCompanies,
} from "@/lib/competitors/refresh/refreshEngine";
import { isStale } from "@/lib/competitors/refresh/refreshPolicy";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

function buildProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
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
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "normal",
    },
    ...overrides,
  };
}

// Milestone 53 — verifies this file's actual, current behavior: each
// "request*" function is a pure transform that replaces only a profile's
// `refresh` field (per refreshPolicy.ts's own composition rules), and
// collectStaleCompanies filters + sorts by refreshPriority urgency
// (urgent first, low last), leaving every non-stale profile out entirely.
describe("requestManualRefresh", () => {
  it("always sets priority urgent, reason manual, and nextRefresh equal to now, regardless of confidence", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 90 });
    const result = requestManualRefresh(profile, now);

    expect(result.refresh.refreshReason).toBe("manual");
    expect(result.refresh.refreshPriority).toBe("urgent");
    expect(result.refresh.nextRefresh).toBe(now.toISOString());
  });

  it("leaves every other field on the profile unchanged", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ name: "Acme", confidence: 90 });
    const result = requestManualRefresh(profile, now);

    expect(result.name).toBe("Acme");
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

describe("collectStaleCompanies", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");

  it("excludes profiles whose nextRefresh is still in the future", () => {
    const fresh = buildProfile({ id: "fresh", refresh: { ...buildProfile().refresh, nextRefresh: "2026-03-01T00:00:00.000Z" } });
    expect(isStale(fresh, now)).toBe(false);

    const result = collectStaleCompanies([fresh], now);
    expect(result).toEqual([]);
  });

  it("includes only stale profiles, ordered most-urgent first", () => {
    const stalePastDue = (id: string, priority: CompanyProfile["refresh"]["refreshPriority"]): CompanyProfile =>
      buildProfile({
        id,
        refresh: {
          lastUpdated: "2026-01-01T00:00:00.000Z",
          nextRefresh: "2026-01-01T00:00:00.000Z",
          refreshReason: "scheduled",
          refreshPriority: priority,
        },
      });

    const normal = stalePastDue("normal_company", "normal");
    const urgent = stalePastDue("urgent_company", "urgent");
    const low = stalePastDue("low_company", "low");
    const high = stalePastDue("high_company", "high");

    const result = collectStaleCompanies([normal, urgent, low, high], now);

    expect(result.map((profile) => profile.id)).toEqual([
      "urgent_company",
      "high_company",
      "normal_company",
      "low_company",
    ]);
  });
});
