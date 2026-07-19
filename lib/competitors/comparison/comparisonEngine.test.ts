import { describe, it, expect } from "vitest";
import { buildComparison } from "@/lib/competitors/comparison/comparisonEngine";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompetitorScore } from "@/lib/competitors/schemas/scoring.schema";
import type { ComparisonDimension } from "@/lib/competitors/schemas/enums";

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

function tableFor(matrix: ReturnType<typeof buildComparison>, dimension: ComparisonDimension) {
  const table = matrix.tables.find((t) => t.dimension === dimension);
  if (!table) throw new Error(`No table found for dimension ${dimension}`);
  return table;
}

// Milestone 52 — verifies this file's actual, current rendering behavior
// per dimension, including the two real formatting branches in
// renderPricing (a priced tier vs. the "custom pricing" fallback) and
// renderMarketPosition's dependency on an optional scores map.
describe("buildComparison", () => {
  it("includes companyIds in profile order and one table per dimension", () => {
    const profiles = [buildProfile({ id: "company_1" }), buildProfile({ id: "company_2" })];
    const matrix = buildComparison(profiles);

    expect(matrix.companyIds).toEqual(["company_1", "company_2"]);
    expect(matrix.tables).toHaveLength(8);
  });

  it("renders the features dimension directly from profile.features", () => {
    const profiles = [buildProfile({ features: ["SSO", "API access"] })];
    const matrix = buildComparison(profiles);

    expect(tableFor(matrix, "features").cells[0].values).toEqual(["SSO", "API access"]);
  });

  it("renders a priced pricing tier with billing period", () => {
    const profiles = [
      buildProfile({
        pricing: { tiers: [{ name: "Pro", priceUsd: 49, billingPeriod: "monthly" }] },
      }),
    ];
    const matrix = buildComparison(profiles);

    expect(tableFor(matrix, "pricing").cells[0].values).toEqual(["Pro: $49/monthly"]);
  });

  it("renders 'custom pricing' when a tier has no priceUsd", () => {
    const profiles = [buildProfile({ pricing: { tiers: [{ name: "Enterprise" }] } })];
    const matrix = buildComparison(profiles);

    expect(tableFor(matrix, "pricing").cells[0].values).toEqual(["Enterprise: custom pricing"]);
  });

  it("renders an empty pricing cell when the profile has no pricing at all", () => {
    const profiles = [buildProfile({ pricing: undefined })];
    const matrix = buildComparison(profiles);

    expect(tableFor(matrix, "pricing").cells[0].values).toEqual([]);
  });

  it("renders business_model and target_market as single-element arrays when present, empty when absent", () => {
    const withValues = buildComparison([buildProfile({ businessModel: "SaaS", targetMarket: "SMB" })]);
    expect(tableFor(withValues, "business_model").cells[0].values).toEqual(["SaaS"]);
    expect(tableFor(withValues, "target_market").cells[0].values).toEqual(["SMB"]);

    const withoutValues = buildComparison([buildProfile()]);
    expect(tableFor(withoutValues, "business_model").cells[0].values).toEqual([]);
    expect(tableFor(withoutValues, "target_market").cells[0].values).toEqual([]);
  });

  it("renders strengths, weaknesses, and technology directly from the profile", () => {
    const profiles = [
      buildProfile({
        strengths: ["Strong brand"],
        weaknesses: ["Slow support"],
        technology: ["React"],
      }),
    ];
    const matrix = buildComparison(profiles);

    expect(tableFor(matrix, "strengths").cells[0].values).toEqual(["Strong brand"]);
    expect(tableFor(matrix, "weaknesses").cells[0].values).toEqual(["Slow support"]);
    expect(tableFor(matrix, "technology").cells[0].values).toEqual(["React"]);
  });

  it("renders market_position from the provided score, when a matching score exists", () => {
    const profiles = [buildProfile({ id: "company_1" })];
    const scores: CompetitorScore[] = [
      {
        companyId: "company_1",
        dimensions: [],
        overallScore: 62,
        scoredAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const matrix = buildComparison(profiles, scores);

    expect(tableFor(matrix, "market_position").cells[0].values).toEqual(["Overall score: 62/100"]);
  });

  it("renders an empty market_position cell when no score matches the profile", () => {
    const profiles = [buildProfile({ id: "company_1" })];
    const matrix = buildComparison(profiles);

    expect(tableFor(matrix, "market_position").cells[0].values).toEqual([]);
  });

  it("carries companyId and companyName through onto every cell", () => {
    const profiles = [buildProfile({ id: "company_1", name: "Acme" })];
    const matrix = buildComparison(profiles);

    expect(tableFor(matrix, "features").cells[0]).toMatchObject({
      companyId: "company_1",
      companyName: "Acme",
    });
  });
});
