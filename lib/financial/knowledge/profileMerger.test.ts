import { describe, it, expect } from "vitest";
import { mergeFinancialProfile } from "@/lib/financial/knowledge/profileMerger";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import type { Source } from "@/lib/research";

function buildExistingProfile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
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
    revenueStreams: [{ name: "Subscriptions" }],
    expenses: [],
    financialRisks: [],
    financialAssumptions: [],
    sources: [],
    evidence: [],
    confidence: 40,
    refresh: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "high",
    },
    ...overrides,
  };
}

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "Acme pricing page",
    url: "https://acme.com/pricing",
    domain: "acme.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

// Milestone 58 — verifies this file's actual, current merge behavior:
// name-based dedup for structured list fields, exact-string dedup for
// financialAssumptions, URL-based source/evidence dedup, and the explicit
// invariant its own comment names: no FinancialEstimate field is ever
// touched by a merge, only ever recomputed by financialProfileBuilder.ts.
describe("mergeFinancialProfile", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");

  it("dedupes revenueStreams by normalized name", () => {
    const existing = buildExistingProfile({ revenueStreams: [{ name: "Subscriptions" }] });
    const merged = mergeFinancialProfile(
      existing,
      { revenueStreams: [{ name: "  subscriptions  " }], confidence: 50 },
      now
    );

    expect(merged.revenueStreams).toHaveLength(1);
  });

  it("preserves both items when revenueStreams genuinely differ", () => {
    const existing = buildExistingProfile({ revenueStreams: [{ name: "Subscriptions" }] });
    const merged = mergeFinancialProfile(
      existing,
      { revenueStreams: [{ name: "One-time setup fees" }], confidence: 50 },
      now
    );

    expect(merged.revenueStreams.map((s) => s.name)).toEqual(["Subscriptions", "One-time setup fees"]);
  });

  it("dedupes expenses by normalized name", () => {
    const existing = buildExistingProfile({ expenses: [{ name: "AWS hosting" }] });
    const merged = mergeFinancialProfile(existing, { expenses: [{ name: "aws hosting" }], confidence: 50 }, now);

    expect(merged.expenses).toHaveLength(1);
  });

  it("dedupes financialRisks by normalized category:name key", () => {
    const existing = buildExistingProfile({
      financialRisks: [{ category: "liquidity", name: "Low cash reserves" }],
    });
    const merged = mergeFinancialProfile(
      existing,
      { financialRisks: [{ category: "liquidity", name: "low cash reserves" }], confidence: 50 },
      now
    );

    expect(merged.financialRisks).toHaveLength(1);
  });

  it("does not conflate risks with the same name but a different category", () => {
    const existing = buildExistingProfile({
      financialRisks: [{ category: "liquidity", name: "Runway pressure" }],
    });
    const merged = mergeFinancialProfile(
      existing,
      { financialRisks: [{ category: "market", name: "Runway pressure" }], confidence: 50 },
      now
    );

    expect(merged.financialRisks).toHaveLength(2);
  });

  it("unions financialAssumptions, deduplicating exact-string duplicates", () => {
    const existing = buildExistingProfile({ financialAssumptions: ["Assumes 20% MoM growth"] });
    const merged = mergeFinancialProfile(
      existing,
      { financialAssumptions: ["Assumes 20% MoM growth", "Assumes flat churn"], confidence: 50 },
      now
    );

    expect(merged.financialAssumptions).toEqual(["Assumes 20% MoM growth", "Assumes flat churn"]);
  });

  it("dedupes sources by URL (case/trailing-slash insensitive)", () => {
    const existing = buildExistingProfile({ sources: [buildSource({ url: "https://acme.com/pricing" })] });
    const merged = mergeFinancialProfile(
      existing,
      { sources: [buildSource({ id: "source_2", url: "https://ACME.com/pricing/" })], confidence: 50 },
      now
    );

    expect(merged.sources).toHaveLength(1);
  });

  it("never overwrites a FinancialEstimate field via a merge", () => {
    const existing = buildExistingProfile({ grossMargin: { value: 60, unit: "percent" } });
    const merged = mergeFinancialProfile(existing, { confidence: 50 }, now);

    expect(merged.grossMargin).toEqual({ value: 60, unit: "percent" });
  });

  it("always takes the incoming confidence value", () => {
    const existing = buildExistingProfile({ confidence: 40 });
    const merged = mergeFinancialProfile(existing, { confidence: 90 }, now);

    expect(merged.confidence).toBe(90);
  });

  it("recomputes refresh metadata with reason 'scheduled' from the incoming confidence", () => {
    const existing = buildExistingProfile();
    const merged = mergeFinancialProfile(existing, { confidence: 10 }, now);

    expect(merged.refresh.refreshReason).toBe("scheduled");
    expect(merged.refresh.lastUpdated).toBe(now.toISOString());
  });
});
