import { describe, it, expect } from "vitest";
import { buildBusinessProfile } from "@/lib/business/knowledge/businessProfileBuilder";
import type { CustomerSegment } from "@/lib/market";

// Milestone 55 — this builder is a composition root: it calls
// deriveBusinessModelFields, deriveStrategy (itself composing
// positioning/moat/gtm/growth), deriveExecution, deriveOperationalRisks,
// deriveBusinessSwot, and deriveOverallHealth. All of those are
// "ARCHITECTURE ONLY" placeholders today, so these tests verify the
// builder's real, current, composed output as a black box — not an
// idealized future synthesis.
describe("buildBusinessProfile", () => {
  it("threads through every explicitly-supplied input field", () => {
    const segments: CustomerSegment[] = [{ name: "SMB owners", painPoints: [] }];
    const profile = buildBusinessProfile({
      customerSegments: segments,
      revenueModel: "subscription",
      revenueStrategyRationale: "Land-and-expand via free tier",
      confidence: 60,
    });

    expect(profile.businessModel).toBe("subscription");
    expect(profile.customerSegments).toEqual(segments);
    expect(profile.revenueStrategy).toBe("Land-and-expand via free tier");
    expect(profile.confidence).toBe(60);
  });

  it("defaults every field the current placeholder synthesis layer can't honestly derive to empty/undefined", () => {
    const profile = buildBusinessProfile({ confidence: 40 });

    expect(profile.valueProposition).toBeUndefined();
    expect(profile.customerProblem).toBeUndefined();
    expect(profile.goToMarketStrategy).toBeUndefined();
    expect(profile.distributionChannels).toEqual([]);
    expect(profile.growthStrategy).toBeUndefined();
    expect(profile.growthDrivers).toEqual([]);
    expect(profile.expansionOpportunities).toEqual([]);
    expect(profile.competitivePosition).toBeUndefined();
    expect(profile.competitiveAdvantages).toEqual([]);
    expect(profile.economicMoat).toEqual({});
    expect(profile.executionComplexity).toBeUndefined();
    expect(profile.keyDependencies).toEqual([]);
    expect(profile.operationalRisks).toEqual([]);
    expect(profile.businessStrengths).toEqual([]);
    expect(profile.businessWeaknesses).toEqual([]);
    expect(profile.businessOpportunities).toEqual([]);
    expect(profile.businessThreats).toEqual([]);
    expect(profile.overallHealth).toEqual({
      rationale: "Overall health assessment requires real scoring-dimension data (see scoring/) — not yet computed.",
    });
  });

  it("defaults sources and evidence to empty arrays when omitted", () => {
    const profile = buildBusinessProfile({ confidence: 40 });
    expect(profile.sources).toEqual([]);
    expect(profile.evidence).toEqual([]);
  });

  it("sets refresh.refreshReason to 'initial_discovery'", () => {
    const profile = buildBusinessProfile({ confidence: 50 });
    expect(profile.refresh.refreshReason).toBe("initial_discovery");
  });

  it("generates a unique id on every call", () => {
    const a = buildBusinessProfile({ confidence: 50 });
    const b = buildBusinessProfile({ confidence: 50 });
    expect(a.id).not.toBe(b.id);
  });

  it("uses the provided `now` for refresh.lastUpdated, defaulting to the current time when omitted", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const profileWithNow = buildBusinessProfile({ confidence: 50, now });
    expect(profileWithNow.refresh.lastUpdated).toBe(now.toISOString());

    const before = Date.now();
    const profileDefault = buildBusinessProfile({ confidence: 50 });
    const after = Date.now();
    const lastUpdatedMs = Date.parse(profileDefault.refresh.lastUpdated);

    expect(lastUpdatedMs).toBeGreaterThanOrEqual(before);
    expect(lastUpdatedMs).toBeLessThanOrEqual(after);
  });
});
