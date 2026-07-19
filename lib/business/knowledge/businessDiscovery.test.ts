import { describe, it, expect, vi } from "vitest";
import { discoverBusiness } from "@/lib/business/knowledge/businessDiscovery";
import { classifyIndustry } from "@/lib/market/classification/industryClassifier";
import type { RankedSource, Source, Evidence, ResearchResult } from "@/lib/research";

// Milestone 56 — the only TRUE external boundary in discoverBusiness()'s
// entire call graph is runResearch() (network/search providers). Every
// other dependency it calls — discoverCompetitors, discoverMarket,
// discoverFinancials, and (transitively) classifyIndustry — is real,
// deterministic, in-process logic whose own only external dependency is
// this same runResearch(), so mocking any of them individually would mock
// something that isn't actually a boundary. Mocking runResearch once here
// makes the whole chain deterministic while exercising genuine
// cross-platform composition, not hand-built stand-in data.
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

describe("discoverBusiness", () => {
  it("threads through the direct business-query research sources/evidence, and the honest current absence of cross-platform business-model fields", async () => {
    const evidence: Evidence[] = [
      {
        id: "evidence_1",
        claim: "Acme is a competitor",
        evidence: "Acme's homepage describes a competing product.",
        confidence: 70,
        source: buildSource(),
        url: "https://acme.com",
        retrievedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    runResearchMock.mockResolvedValue(
      buildResearchResult({
        sources: [],
        evidence,
        sourceSummary: { totalSources: 0, uniqueDomains: 0, averageConfidence: null, bySourceType: [] },
      })
    );

    const result = await discoverBusiness({ startupIdea: STARTUP_IDEA });

    // These fields aren't yet populated by any sibling platform's own
    // discovery function today — an honest, current absence, not a bug.
    expect(result.profile.businessModel).toBeUndefined();
    expect(result.profile.revenueStrategy).toBeUndefined();
    expect(result.profile.customerSegments).toEqual([]);
    expect(result.fundingStage).toBeUndefined();

    expect(result.profile.evidence).toEqual(evidence);
  });

  it("derives marketIndustry from the real classifyIndustry() heuristic applied to the startup idea", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await discoverBusiness({ startupIdea: STARTUP_IDEA });
    const expectedClassification = classifyIndustry(STARTUP_IDEA);

    expect(result.marketIndustry).toBe(expectedClassification.industry);
  });

  it("sets competitorCount from the real discoverCompetitors() grouping of the mocked sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await discoverBusiness({ startupIdea: STARTUP_IDEA });

    expect(result.competitorCount).toBe(1);
  });

  it("returns competitorCount 0 when research finds no sources at all", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await discoverBusiness({ startupIdea: STARTUP_IDEA });

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
    const financialConfidence = Math.round(marketConfidence / 2);
    // business's own computeDiscoveryConfidence(null, marketConfidence, financialConfidence)
    const upstreamAverage = Math.round((marketConfidence + financialConfidence) / 2);

    const result = await discoverBusiness({ startupIdea: STARTUP_IDEA });

    expect(result.profile.confidence).toBe(upstreamAverage);
  });

  it("returns a valid confidence (0-100) end-to-end when research does find sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({
        sources: [buildRankedSource()],
        sourceSummary: { totalSources: 1, uniqueDomains: 1, averageConfidence: 80, bySourceType: [] },
      })
    );

    const result = await discoverBusiness({ startupIdea: STARTUP_IDEA });

    expect(result.profile.confidence).toBeGreaterThanOrEqual(0);
    expect(result.profile.confidence).toBeLessThanOrEqual(100);
  });

  it("echoes the original request back on the result", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await discoverBusiness({ startupIdea: STARTUP_IDEA });

    expect(result.request).toEqual({ startupIdea: STARTUP_IDEA });
  });
});
