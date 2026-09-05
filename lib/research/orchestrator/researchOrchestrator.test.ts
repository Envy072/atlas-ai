import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";
import type { Source } from "@/lib/research/schemas/source.schema";
import type { ManagedProviderResult } from "@/lib/research/manager/providerManager";

// ProviderManager's own retry/fallback/timeout orchestration is a
// separate concern with its own dedicated test
// (lib/research/manager/providerManager.test.ts) — mocked here so this
// file stays focused on its actual subject: runResearch()'s real
// assembly of ProviderManager's output into one ResearchResult (merge,
// dedupe, rank, evidence, summaries), none of which is mocked.
vi.mock("@/lib/research/manager/providerManager", () => ({
  searchViaProviderManager: vi.fn(),
}));

import { searchViaProviderManager } from "@/lib/research/manager/providerManager";
import { runResearch } from "@/lib/research/orchestrator/researchOrchestrator";

const mockedSearch = vi.mocked(searchViaProviderManager);

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "A real result",
    url: "https://example.com/result",
    domain: "example.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

function buildResult(overrides: Partial<ProviderResult> = {}): ProviderResult {
  return {
    providerId: "tavily",
    query: "test topic",
    status: "ok",
    sources: [],
    fetchedAt: "2026-01-01T00:00:00.000Z",
    tookMs: 5,
    ...overrides,
  };
}

function buildOutcome(overrides: Partial<ManagedProviderResult> = {}): ManagedProviderResult {
  return {
    result: buildResult(),
    health: "healthy",
    usedAsFallback: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockedSearch.mockReset();
});

describe("runResearch", () => {
  it("merges sources from multiple provider outcomes and dedupes a URL repeated across two providers", async () => {
    const shared = buildSource({ url: "https://example.com/shared", providerId: "tavily" });
    mockedSearch.mockResolvedValue([
      buildOutcome({ result: buildResult({ providerId: "tavily", sources: [shared] }) }),
      buildOutcome({
        result: buildResult({
          providerId: "brave",
          sources: [
            buildSource({ id: "source_2", url: "https://example.com/shared", providerId: "brave" }),
            buildSource({ id: "source_3", url: "https://example.com/unique", providerId: "brave" }),
          ],
        }),
        usedAsFallback: true,
      }),
    ]);

    const result = await runResearch({ topic: "test topic" });

    expect(result.sources).toHaveLength(2);
    expect(result.sources.map((source) => source.url).sort()).toEqual([
      "https://example.com/shared",
      "https://example.com/unique",
    ]);
    // First-seen wins on a dedup collision (dedupeSources' own documented
    // behavior) — the tavily copy, not the brave one merged in second.
    const sharedResult = result.sources.find((source) => source.url === "https://example.com/shared");
    expect(sharedResult?.providerId).toBe("tavily");
    expect(result.evidence).toHaveLength(2);
    expect(result.providerResults).toHaveLength(2);
  });

  it("produces accurate summary statistics reflecting each outcome's real status and fallback flag", async () => {
    mockedSearch.mockResolvedValue([
      buildOutcome({ result: buildResult({ providerId: "tavily", status: "error" }) }),
      buildOutcome({
        result: buildResult({ providerId: "brave", sources: [buildSource({ providerId: "brave" })] }),
        usedAsFallback: true,
      }),
    ]);

    const result = await runResearch({ topic: "test topic" });

    expect(result.searchStatistics.providersQueried).toBe(2);
    expect(result.searchStatistics.providersSucceeded).toBe(1);
    expect(result.searchStatistics.providersFailed).toBe(1);
    expect(result.searchStatistics.fallbackTriggered).toBe(true);
    expect(result.providerSummary).toHaveLength(2);
    expect(result.providerSummary.find((s) => s.providerId === "brave")?.usedAsFallback).toBe(true);
  });

  it("returns an honest, empty result — never a fabricated average — when every provider found nothing", async () => {
    mockedSearch.mockResolvedValue([
      buildOutcome({ result: buildResult({ providerId: "tavily", sources: [] }) }),
    ]);

    const result = await runResearch({ topic: "test topic" });

    expect(result.sources).toEqual([]);
    expect(result.evidence).toEqual([]);
    expect(result.sourceSummary.totalSources).toBe(0);
    expect(result.sourceSummary.averageConfidence).toBeNull();
  });
});
