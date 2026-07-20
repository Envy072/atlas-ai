import { describe, it, expect, vi } from "vitest";
import { researchStage } from "@/lib/pipeline/stages/research";
import type { ResearchResult } from "@/lib/research";

// Milestone 85 — researchStage's one dependency, runResearch, is itself
// the true external boundary — there is no intermediate real logic to
// let run for real here, unlike the other stage wrappers. A thin wrapper
// whose observable behavior is limited to constructing the expected
// query string and delegating to the external boundary.
const { runResearchMock } = vi.hoisted(() => ({ runResearchMock: vi.fn() }));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");
  return { ...actual, runResearch: runResearchMock };
});

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

describe("researchStage", () => {
  it("has the name 'research'", () => {
    expect(researchStage.name).toBe("research");
  });

  it("calls runResearch with the pipeline's own general-framing query", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    await researchStage.run("A subscription software platform for team scheduling");

    expect(runResearchMock).toHaveBeenCalledWith({
      topic: "general research pass for: A subscription software platform for team scheduling",
    });
  });

  it("returns exactly what runResearch resolves to", async () => {
    const result = buildResearchResult({
      sources: [],
      sourceSummary: { totalSources: 0, uniqueDomains: 0, averageConfidence: null, bySourceType: [] },
    });
    runResearchMock.mockResolvedValue(result);

    await expect(researchStage.run("An idea")).resolves.toEqual(result);
  });
});
