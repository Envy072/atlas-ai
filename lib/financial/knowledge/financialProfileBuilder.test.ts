import { describe, it, expect } from "vitest";
import { buildFinancialProfile } from "@/lib/financial/knowledge/financialProfileBuilder";

// Milestone 58 — this builder is a composition root: it calls
// estimateLTV/estimateCAC (economics/unitEconomics.ts), estimateGrossMargin/
// estimateOperatingMargin/estimateBurnRate/estimateRunway/estimateBreakEven
// (economics/operatingEconomics.ts), estimateMRR/estimateARR
// (economics/growthEconomics.ts), estimatePaybackPeriod
// (economics/customerEconomics.ts), and computeLtvToCacRatio
// (metrics/ltvToCacRatio.ts). Every economics/ estimator is "ARCHITECTURE
// ONLY, NO FABRICATED NUMBERS" today — these tests verify the builder's
// real, current, composed output as a black box, not an idealized future
// estimate.
describe("buildFinancialProfile", () => {
  it("threads through every explicitly-supplied input field", () => {
    const profile = buildFinancialProfile({
      revenueModel: "subscription",
      financialAssumptions: ["Assumes 20% MoM growth"],
      confidence: 60,
    });

    expect(profile.revenueModel).toBe("subscription");
    expect(profile.financialAssumptions).toEqual(["Assumes 20% MoM growth"]);
    expect(profile.confidence).toBe(60);
  });

  it("leaves every FinancialEstimate field's value undefined today, per the current placeholder economics layer", () => {
    const profile = buildFinancialProfile({ confidence: 40 });

    expect(profile.grossMargin.value).toBeUndefined();
    expect(profile.operatingMargin.value).toBeUndefined();
    expect(profile.burnRate.value).toBeUndefined();
    expect(profile.runway.value).toBeUndefined();
    expect(profile.breakEven.value).toBeUndefined();
    expect(profile.cac.value).toBeUndefined();
    expect(profile.ltv.value).toBeUndefined();
    expect(profile.mrr.value).toBeUndefined();
    expect(profile.arr.value).toBeUndefined();
    expect(profile.paybackPeriod.value).toBeUndefined();
  });

  it("computes ltvToCac as honestly unknown today, since its own LTV/CAC inputs are still unknown", () => {
    const profile = buildFinancialProfile({ confidence: 40 });

    expect(profile.ltvToCac.value).toBeUndefined();
    expect(profile.ltvToCac.methodology).toBe(
      "LTV ÷ CAC — cannot be computed until both LTV and CAC are known."
    );
  });

  it("defaults revenueStreams, expenses, financialRisks, and financialAssumptions to empty arrays when omitted", () => {
    const profile = buildFinancialProfile({ confidence: 40 });

    expect(profile.revenueStreams).toEqual([]);
    expect(profile.expenses).toEqual([]);
    expect(profile.financialRisks).toEqual([]);
    expect(profile.financialAssumptions).toEqual([]);
  });

  it("defaults sources and evidence to empty arrays when omitted", () => {
    const profile = buildFinancialProfile({ confidence: 40 });
    expect(profile.sources).toEqual([]);
    expect(profile.evidence).toEqual([]);
  });

  it("sets refresh.refreshReason to 'initial_discovery'", () => {
    const profile = buildFinancialProfile({ confidence: 50 });
    expect(profile.refresh.refreshReason).toBe("initial_discovery");
  });

  it("generates a unique id on every call", () => {
    const a = buildFinancialProfile({ confidence: 50 });
    const b = buildFinancialProfile({ confidence: 50 });
    expect(a.id).not.toBe(b.id);
  });

  it("uses the provided `now` for refresh.lastUpdated, defaulting to the current time when omitted", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const profileWithNow = buildFinancialProfile({ confidence: 50, now });
    expect(profileWithNow.refresh.lastUpdated).toBe(now.toISOString());

    const before = Date.now();
    const profileDefault = buildFinancialProfile({ confidence: 50 });
    const after = Date.now();
    const lastUpdatedMs = Date.parse(profileDefault.refresh.lastUpdated);

    expect(lastUpdatedMs).toBeGreaterThanOrEqual(before);
    expect(lastUpdatedMs).toBeLessThanOrEqual(after);
  });
});
