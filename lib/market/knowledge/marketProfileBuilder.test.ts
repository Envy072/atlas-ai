import { describe, it, expect } from "vitest";
import { buildMarketProfile } from "@/lib/market/knowledge/marketProfileBuilder";

// Milestone 61 — this builder is a composition root: it calls
// buildMarketSizing() (sizing/marketSizing.ts, the currently implemented
// composition function among otherwise-placeholder estimators) as its
// default sizing, and buildMarketRefreshMetadata() (refresh/
// marketRefreshPolicy.ts). These tests verify the builder's real, current,
// composed output as a black box.
describe("buildMarketProfile", () => {
  it("threads through every explicitly-supplied input field", () => {
    const profile = buildMarketProfile({
      industry: "saas",
      subIndustry: "vertical saas",
      confidence: 60,
    });

    expect(profile.industry).toBe("saas");
    expect(profile.subIndustry).toBe("vertical saas");
    expect(profile.confidence).toBe(60);
  });

  it("defaults sizing to buildMarketSizing's honest 'not yet computed' estimates when omitted", () => {
    const profile = buildMarketProfile({ industry: "saas", confidence: 40 });

    expect(profile.sizing.tam.valueUsd).toBeUndefined();
    expect(profile.sizing.sam.valueUsd).toBeUndefined();
    expect(profile.sizing.som.valueUsd).toBeUndefined();
    expect(profile.sizing.tam.methodology).toContain("saas");
  });

  it("threads through an explicitly-supplied sizing object instead of defaulting", () => {
    const customSizing = { tam: { valueUsd: 5_000_000 }, sam: {}, som: {} };
    const profile = buildMarketProfile({ industry: "saas", sizing: customSizing, confidence: 40 });

    expect(profile.sizing).toEqual(customSizing);
  });

  it("defaults every list field to an empty array when omitted", () => {
    const profile = buildMarketProfile({ industry: "saas", confidence: 40 });

    expect(profile.customerSegments).toEqual([]);
    expect(profile.geographicMarkets).toEqual([]);
    expect(profile.regulations).toEqual([]);
    expect(profile.risks).toEqual([]);
    expect(profile.trends).toEqual([]);
    expect(profile.sources).toEqual([]);
    expect(profile.evidence).toEqual([]);
  });

  it("leaves subIndustry, growthRate, and marketMaturity undefined when not supplied", () => {
    const profile = buildMarketProfile({ industry: "saas", confidence: 40 });

    expect(profile.subIndustry).toBeUndefined();
    expect(profile.growthRate).toBeUndefined();
    expect(profile.marketMaturity).toBeUndefined();
  });

  it("sets refresh.refreshReason to 'initial_discovery'", () => {
    const profile = buildMarketProfile({ industry: "saas", confidence: 50 });
    expect(profile.refresh.refreshReason).toBe("initial_discovery");
  });

  it("generates a unique id on every call", () => {
    const a = buildMarketProfile({ industry: "saas", confidence: 50 });
    const b = buildMarketProfile({ industry: "saas", confidence: 50 });
    expect(a.id).not.toBe(b.id);
  });

  it("uses the provided `now` for refresh.lastUpdated, defaulting to the current time when omitted", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const profileWithNow = buildMarketProfile({ industry: "saas", confidence: 50, now });
    expect(profileWithNow.refresh.lastUpdated).toBe(now.toISOString());

    const before = Date.now();
    const profileDefault = buildMarketProfile({ industry: "saas", confidence: 50 });
    const after = Date.now();
    const lastUpdatedMs = Date.parse(profileDefault.refresh.lastUpdated);

    expect(lastUpdatedMs).toBeGreaterThanOrEqual(before);
    expect(lastUpdatedMs).toBeLessThanOrEqual(after);
  });
});
