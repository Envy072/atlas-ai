import { describe, it, expect, vi } from "vitest";
import { discoverMarket } from "@/lib/market/knowledge/marketDiscovery";
import { classifyIndustry } from "@/lib/market/classification/industryClassifier";
import type { RankedSource, Evidence, ResearchResult } from "@/lib/research";

// Milestone 62 — discoverMarket() calls runResearch directly and
// discoverCompetitors() (itself a real, deterministic function whose only
// actual external dependency is runResearch). Mocking only runResearch —
// the one true external boundary — lets discoverCompetitors run for real.
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

describe("discoverMarket", () => {
  it("derives industry and subIndustry from the real classifyIndustry() heuristic", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await discoverMarket({ startupIdea: STARTUP_IDEA });
    const expectedClassification = classifyIndustry(STARTUP_IDEA);

    expect(result.profile.industry).toBe(expectedClassification.industry);
    expect(result.profile.subIndustry).toBe(expectedClassification.subIndustry);
  });

  it("threads through the direct market-query research sources/evidence", async () => {
    const evidence: Evidence[] = [
      {
        id: "evidence_1",
        claim: "The market is growing",
        evidence: "An industry report cites double-digit growth.",
        confidence: 70,
        source: {
          id: "source_1",
          providerId: "tavily",
          sourceType: "search_engine",
          title: "Industry report",
          url: "https://example.com/report",
          domain: "example.com",
          retrievedAt: "2026-01-01T00:00:00.000Z",
          confidence: 80,
        },
        url: "https://example.com/report",
        retrievedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [], evidence }));

    const result = await discoverMarket({ startupIdea: STARTUP_IDEA });

    expect(result.profile.evidence).toEqual(evidence);
  });

  it("sets competitorCount from the real discoverCompetitors() grouping of the mocked sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await discoverMarket({ startupIdea: STARTUP_IDEA });

    expect(result.competitorCount).toBe(1);
  });

  it("returns competitorCount 0 when research finds no sources at all", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await discoverMarket({ startupIdea: STARTUP_IDEA });

    expect(result.competitorCount).toBe(0);
  });

  it("computes a fully-derived confidence when research finds no sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({
        sources: [],
        sourceSummary: { totalSources: 0, uniqueDomains: 0, averageConfidence: null, bySourceType: [] },
      })
    );

    const classification = classifyIndustry(STARTUP_IDEA);
    // this file's own computeDiscoveryConfidence(null, classification.confidence)
    const expectedConfidence = Math.round(classification.confidence / 2);

    const result = await discoverMarket({ startupIdea: STARTUP_IDEA });

    expect(result.profile.confidence).toBe(expectedConfidence);
  });

  it("returns a valid confidence (0-100) end-to-end when research does find sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({
        sources: [buildRankedSource()],
        sourceSummary: { totalSources: 1, uniqueDomains: 1, averageConfidence: 80, bySourceType: [] },
      })
    );

    const result = await discoverMarket({ startupIdea: STARTUP_IDEA });

    expect(result.profile.confidence).toBeGreaterThanOrEqual(0);
    expect(result.profile.confidence).toBeLessThanOrEqual(100);
  });

  it("echoes the original request back on the result", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await discoverMarket({ startupIdea: STARTUP_IDEA });

    expect(result.request).toEqual({ startupIdea: STARTUP_IDEA });
  });
});
