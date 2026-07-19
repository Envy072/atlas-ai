import { describe, it, expect, vi } from "vitest";
import { discoverFinancials } from "@/lib/financial/knowledge/financialDiscovery";
import { classifyIndustry } from "@/lib/market/classification/industryClassifier";
import type { RankedSource, Source, Evidence, ResearchResult } from "@/lib/research";

// Milestone 59 — discoverFinancials() exercises three research paths
// (its own direct runResearch() call, plus discoverCompetitors() and
// discoverMarket(), each real, deterministic, in-process functions whose
// only actual external dependency is runResearch itself) — all isolated
// through this single mocked runResearch boundary, the same approach
// already used for businessDiscovery.test.ts (M56).
const { runResearchMock } = vi.hoisted(() => ({ runResearchMock: vi.fn() }));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");
  return { ...actual, runResearch: runResearchMock };
});

const STARTUP_IDEA = "A subscription software platform for team scheduling";

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

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "company_website",
    title: "Acme",
    url: "https://acme.com",
    domain: "acme.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
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

describe("discoverFinancials", () => {
  it("threads through the direct financial-query research sources/evidence", async () => {
    const evidence: Evidence[] = [
      {
        id: "evidence_1",
        claim: "Acme charges a monthly subscription",
        evidence: "Acme's pricing page lists monthly subscription tiers.",
        confidence: 70,
        source: buildSource(),
        url: "https://acme.com",
        retrievedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [], evidence }));

    const result = await discoverFinancials({ startupIdea: STARTUP_IDEA });

    expect(result.profile.evidence).toEqual(evidence);
  });

  it("builds initial financial assumptions from the real marketIndustry and competitorCount signals", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await discoverFinancials({ startupIdea: STARTUP_IDEA });

    expect(result.profile.financialAssumptions).toEqual([
      `Industry classified as "${result.marketIndustry}" by the Market Intelligence Platform.`,
      `${result.competitorCount} competitor candidate(s) identified by the Competitor Intelligence Platform for pricing context.`,
    ]);
  });

  it("sets competitorCount from the real discoverCompetitors() grouping of the mocked sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await discoverFinancials({ startupIdea: STARTUP_IDEA });

    expect(result.competitorCount).toBe(1);
  });

  it("returns competitorCount 0 when research finds no sources at all", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await discoverFinancials({ startupIdea: STARTUP_IDEA });

    expect(result.competitorCount).toBe(0);
  });

  it("computes a fully-derived confidence when research finds no sources anywhere in the chain", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({
        sources: [],
        sourceSummary: { totalSources: 0, uniqueDomains: 0, averageConfidence: null, bySourceType: [] },
      })
    );

    const classification = classifyIndustry(STARTUP_IDEA);

    // market's own computeDiscoveryConfidence(null, classification.confidence)
    const marketConfidence = Math.round(classification.confidence / 2);
    // financial's own computeDiscoveryConfidence(null, marketConfidence)
    const expectedConfidence = Math.round(marketConfidence / 2);

    const result = await discoverFinancials({ startupIdea: STARTUP_IDEA });

    expect(result.profile.confidence).toBe(expectedConfidence);
  });

  it("returns a valid confidence (0-100) end-to-end when research does find sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({
        sources: [buildRankedSource()],
        sourceSummary: { totalSources: 1, uniqueDomains: 1, averageConfidence: 80, bySourceType: [] },
      })
    );

    const result = await discoverFinancials({ startupIdea: STARTUP_IDEA });

    expect(result.profile.confidence).toBeGreaterThanOrEqual(0);
    expect(result.profile.confidence).toBeLessThanOrEqual(100);
  });

  it("echoes the original request back on the result", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await discoverFinancials({ startupIdea: STARTUP_IDEA });

    expect(result.request).toEqual({ startupIdea: STARTUP_IDEA });
  });
});
