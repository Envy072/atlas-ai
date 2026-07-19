import { describe, it, expect, vi } from "vitest";
import { discoverCompetitors } from "@/lib/competitors/discovery/competitorDiscovery";
import type { RankedSource, Evidence, ResearchResult } from "@/lib/research";

const { runResearchMock } = vi.hoisted(() => ({ runResearchMock: vi.fn() }));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");
  return { ...actual, runResearch: runResearchMock };
});

function buildRankedSource(overrides: Partial<RankedSource> = {}): RankedSource {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
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
  const source = buildRankedSource();
  return {
    id: "evidence_1",
    claim: "Acme is a competitor",
    evidence: "Acme's homepage describes a competing product.",
    confidence: 70,
    source,
    url: source.url,
    retrievedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildResearchResult(overrides: Partial<ResearchResult> = {}): ResearchResult {
  return {
    request: { topic: "companies competing with: a CRM for small teams" },
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

// Milestone 54 — verifies this file's actual, current orchestration logic:
// grouping ranked sources by normalized candidate name, confidence
// averaging within a group, the company_website-only rule for
// findOfficialWebsite, descending-confidence sort, and maxCandidates
// truncation. runResearch is mocked since this is the first test in the
// repo to depend on it — the mock returns a real ResearchResult shape,
// not a hand-guessed one.
describe("discoverCompetitors", () => {
  it("returns one candidate per distinct company, averaging confidence across its sources", async () => {
    const sourceA = buildRankedSource({ id: "s1", title: "Acme", url: "https://acme.com/1", confidence: 80 });
    const sourceB = buildRankedSource({ id: "s2", title: "Acme", url: "https://acme.com/2", confidence: 60 });

    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources: [sourceA, sourceB], evidence: [] }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams" });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].candidateName).toBe("Acme");
    expect(result.candidates[0].confidence).toBe(70);
  });

  it("groups sources that extract to the same normalized candidate name", async () => {
    const sourceA = buildRankedSource({ id: "s1", title: "Acme | Home", url: "https://acme.com/1" });
    const sourceB = buildRankedSource({ id: "s2", title: "Acme, Inc.", url: "https://acme.com/2" });

    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources: [sourceA, sourceB] }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams" });

    expect(result.candidates).toHaveLength(1);
  });

  it("attaches matching evidence to the group by URL", async () => {
    const source = buildRankedSource({ id: "s1", title: "Acme", url: "https://acme.com" });
    const evidence = buildEvidence({ url: "https://acme.com" });

    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources: [source], evidence: [evidence] }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams" });

    expect(result.candidates[0].evidence).toHaveLength(1);
  });

  it("only uses a company_website-typed source for the candidate's website", async () => {
    const newsSource = buildRankedSource({
      id: "s1",
      title: "Acme",
      url: "https://news.example.com/acme-raises-funding",
      sourceType: "news",
    });

    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources: [newsSource] }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams" });

    expect(result.candidates[0].website).toBeUndefined();
  });

  it("sets the website from a company_website-typed source", async () => {
    const officialSource = buildRankedSource({
      id: "s1",
      title: "Acme",
      url: "https://acme.com",
      sourceType: "company_website",
    });

    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources: [officialSource] }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams" });

    expect(result.candidates[0].website).toBe("https://acme.com");
  });

  it("sorts candidates by descending confidence", async () => {
    const lowConfidence = buildRankedSource({ id: "s1", title: "Low Co", url: "https://low.com", confidence: 20 });
    const highConfidence = buildRankedSource({ id: "s2", title: "High Co", url: "https://high.com", confidence: 90 });

    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources: [lowConfidence, highConfidence] }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams" });

    expect(result.candidates.map((candidate) => candidate.candidateName)).toEqual(["High Co", "Low Co"]);
  });

  it("truncates results to the default maxCandidates of 10", async () => {
    const sources = Array.from({ length: 15 }, (_, index) =>
      buildRankedSource({ id: `s${index}`, title: `Company ${index}`, url: `https://company${index}.com`, confidence: index })
    );

    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams" });

    expect(result.candidates).toHaveLength(10);
  });

  it("respects a custom maxCandidates value", async () => {
    const sources = Array.from({ length: 5 }, (_, index) =>
      buildRankedSource({ id: `s${index}`, title: `Company ${index}`, url: `https://company${index}.com`, confidence: index })
    );

    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams", maxCandidates: 2 });

    expect(result.candidates).toHaveLength(2);
  });

  it("returns an empty candidate list when research finds no sources", async () => {
    runResearchMock.mockResolvedValueOnce(buildResearchResult({ sources: [] }));

    const result = await discoverCompetitors({ startupIdea: "a CRM for small teams" });

    expect(result.candidates).toEqual([]);
  });
});
