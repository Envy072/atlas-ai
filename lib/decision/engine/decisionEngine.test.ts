import { describe, it, expect, vi } from "vitest";
import { synthesizeDecision } from "@/lib/decision/engine/decisionEngine";
import type { RankedSource, ResearchResult, Evidence } from "@/lib/research";

// synthesizeDecision() is the Decision Intelligence platform's own
// composition root — every already-tested facet (aggregateEvidence,
// deriveFindings, deriveCriticalRisks, deriveInvestmentThesis,
// buildDecisionProfile) composes into it, plus discoverCompetitors,
// discoverMarket, discoverFinancials, discoverBusiness,
// resolveCompetitorKnowledge, and resolveMarketKnowledge — all real,
// already independently tested collaborators. Its one true external
// boundary is runResearch, reached both directly and transitively
// through every one of the five platform calls it fans out to
// concurrently. Mocking only that lets the entire real chain run,
// exactly as lib/pipeline/stages/decision.test.ts already proved for
// this same function one layer removed — this file tests it directly.
const { runResearchMock } = vi.hoisted(() => ({ runResearchMock: vi.fn() }));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");
  return { ...actual, runResearch: runResearchMock };
});

function buildRankedSource(overrides: Partial<RankedSource> = {}): RankedSource {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "company_website",
    title: "Acme",
    url: "https://acme.com",
    domain: "acme.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    score: 80,
    factors: { authority: 50, freshness: 50, relevance: 50, trust: 50, sourceQuality: 50 },
    ...overrides,
  };
}

function buildEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "evidence_1",
    claim: "The market is growing",
    evidence: "An industry report cites double-digit growth.",
    confidence: 70,
    source: buildRankedSource(),
    url: "https://acme.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildResearchResult(overrides: Partial<ResearchResult> = {}): ResearchResult {
  return {
    request: { topic: "placeholder" },
    sources: [],
    evidence: [],
    providerResults: [],
    providerSummary: [],
    sourceSummary: { totalSources: 0, uniqueDomains: 0, averageConfidence: null, bySourceType: [] },
    searchStatistics: {
      providersQueried: 0,
      providersSucceeded: 0,
      providersFailed: 0,
      totalLatencyMs: 0,
      fallbackTriggered: false,
    },
    generatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("synthesizeDecision", () => {
  it("returns a request that echoes the input startupIdea", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await synthesizeDecision({ startupIdea: "A subscription scheduling tool" });

    expect(result.request).toEqual({ startupIdea: "A subscription scheduling tool" });
  });

  it("returns a real, schema-valid DecisionProfile when research finds no sources", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    expect(result.profile).toBeDefined();
    expect(result.profile.decisionContext.startupIdea).toBe("An idea");
  });

  it("returns a real, schema-valid DecisionProfile when research finds real sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    expect(result.profile.marketProfile).toBeDefined();
    expect(result.profile.financialProfile).toBeDefined();
    expect(result.profile.businessProfile).toBeDefined();
    expect(result.profile.decisionContext.competitorCount).toBeGreaterThanOrEqual(0);
  });

  it("sets generatedAt to a real, current ISO timestamp", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());
    const before = Date.now();

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    const after = Date.now();
    const generatedAtMs = Date.parse(result.generatedAt);
    expect(generatedAtMs).toBeGreaterThanOrEqual(before);
    expect(generatedAtMs).toBeLessThanOrEqual(after);
  });
});

describe("synthesizeDecision's decisionContext wiring", () => {
  it("sets competitorCount to the resolved keyCompetitors count, not a separately-tracked value", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    expect(result.profile.decisionContext.competitorCount).toBe(result.profile.keyCompetitors.length);
  });

  it("sets marketIndustry from the resolved marketProfile's own industry", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    expect(result.profile.decisionContext.marketIndustry).toBe(result.profile.marketProfile.industry);
  });

  it("sets fundingStage from the financial platform's own discovery, unchanged", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    expect(result.profile.decisionContext.fundingStage).toBe(result.profile.financialProfile.fundingStage);
  });
});

describe("synthesizeDecision's businessSummary and SWOT projection", () => {
  it("projects businessSummary fields directly from the resolved BusinessProfile, unchanged", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    expect(result.profile.businessSummary.businessModel).toBe(result.profile.businessProfile.businessModel);
    expect(result.profile.businessSummary.valueProposition).toBe(result.profile.businessProfile.valueProposition);
    expect(result.profile.businessSummary.customerProblem).toBe(result.profile.businessProfile.customerProblem);
    expect(result.profile.businessSummary.competitivePosition).toBe(
      result.profile.businessProfile.competitivePosition
    );
    expect(result.profile.businessSummary.overallHealth).toEqual(result.profile.businessProfile.overallHealth);
  });

  it("projects strengths/weaknesses/opportunities/threats directly from the BusinessProfile's own SWOT, unchanged", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    expect(result.profile.strengths).toEqual(result.profile.businessProfile.businessStrengths);
    expect(result.profile.weaknesses).toEqual(result.profile.businessProfile.businessWeaknesses);
    expect(result.profile.opportunities).toEqual(result.profile.businessProfile.businessOpportunities);
    expect(result.profile.threats).toEqual(result.profile.businessProfile.businessThreats);
  });
});

describe("synthesizeDecision's evidence aggregation", () => {
  it("dedupes evidence sharing the same URL across every platform's own research call into one entry", async () => {
    const sharedEvidence = buildEvidence({ url: "https://acme.com", retrievedAt: "2026-01-01T00:00:00.000Z" });
    runResearchMock.mockResolvedValue(
      buildResearchResult({
        sources: [buildRankedSource({ url: "https://acme.com" })],
        evidence: [sharedEvidence],
      })
    );

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    const matchingEvidence = result.profile.evidence.filter((item) => item.url === "https://acme.com");
    expect(matchingEvidence).toHaveLength(1);
  });

  it("returns an empty evidence list when research finds nothing anywhere", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [], evidence: [] }));

    const result = await synthesizeDecision({ startupIdea: "An idea" });

    expect(result.profile.evidence).toEqual([]);
  });
});
