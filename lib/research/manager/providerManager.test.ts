import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResearchProvider } from "@/lib/research/types/provider";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";
import type { Source } from "@/lib/research/schemas/source.schema";
import type { RetryPolicy } from "@/lib/research/manager/types";

// The registry is the one genuine external boundary here — real
// providers make real HTTP calls (already covered by each provider's own
// test file: tavilyProvider.test.ts/braveProvider.test.ts/
// crunchbaseProvider.test.ts). Mocked with fully-controlled fake
// providers so this file can exercise ProviderManager's OWN
// orchestration logic (fallback ordering, retry, the outer timeout race,
// chain-vs-independent concurrency) deterministically, with no real
// network call and no reliance on any specific provider's parsing.
vi.mock("@/lib/research/providers/registry", () => ({
  getRegisteredProviders: vi.fn(),
  getProviderById: vi.fn(),
}));

import { getRegisteredProviders, getProviderById } from "@/lib/research/providers/registry";
import { searchViaProviderManager } from "@/lib/research/manager/providerManager";
import { resetMetrics } from "@/lib/research/manager/metrics";

const mockedGetRegisteredProviders = vi.mocked(getRegisteredProviders);
const mockedGetProviderById = vi.mocked(getProviderById);

// Small, fixed millisecones — fast enough to keep this suite quick,
// large enough that a fake provider's own scripted delay (also small,
// fixed) reliably resolves before or after the ceiling as each test
// intends. No fake timers: Promise.race + real setTimeout is exactly
// what production runs, and mocking timers around a real Promise.race
// is a common source of the flakiness TESTING.md warns against —
// small real delays are simpler and just as deterministic here.
const FAST_POLICY: RetryPolicy = { timeoutMs: 30, maxRetries: 1, baseBackoffMs: 5 };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function buildFakeProvider(
  id: ResearchProvider["id"],
  sourceType: ResearchProvider["sourceType"],
  search: ResearchProvider["search"]
): ResearchProvider {
  return { id, name: id, sourceType, search };
}

function registerProviders(providers: ResearchProvider[]): void {
  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  mockedGetRegisteredProviders.mockReturnValue(providers);
  mockedGetProviderById.mockImplementation((id) => byId.get(id));
}

beforeEach(() => {
  resetMetrics();
  mockedGetRegisteredProviders.mockReset();
  mockedGetProviderById.mockReset();
});

describe("searchViaProviderManager", () => {
  it("falls through to the next provider in a fallback chain only when the first isn't usable, keeping both attempts in the result", async () => {
    const tavilySearch = vi.fn(async () => buildResult({ providerId: "tavily", status: "error" }));
    const braveSearch = vi.fn(async () =>
      buildResult({ providerId: "brave", sources: [buildSource({ providerId: "brave" })] })
    );
    registerProviders([
      buildFakeProvider("tavily", "search_engine", tavilySearch),
      buildFakeProvider("brave", "search_engine", braveSearch),
    ]);

    const outcomes = await searchViaProviderManager(
      { topic: "test topic" },
      { providerIds: ["tavily", "brave"], policy: FAST_POLICY }
    );

    expect(braveSearch).toHaveBeenCalledTimes(1);
    expect(outcomes).toHaveLength(2);

    const tavilyOutcome = outcomes.find((outcome) => outcome.result.providerId === "tavily");
    const braveOutcome = outcomes.find((outcome) => outcome.result.providerId === "brave");
    expect(tavilyOutcome?.usedAsFallback).toBe(false);
    expect(braveOutcome?.usedAsFallback).toBe(true);
    expect(braveOutcome?.result.status).toBe("ok");
  });

  it("never calls the fallback provider once the first in the chain returns a usable result", async () => {
    const tavilySearch = vi.fn(async () =>
      buildResult({ providerId: "tavily", sources: [buildSource()] })
    );
    const braveSearch = vi.fn(async () => buildResult({ providerId: "brave" }));
    registerProviders([
      buildFakeProvider("tavily", "search_engine", tavilySearch),
      buildFakeProvider("brave", "search_engine", braveSearch),
    ]);

    const outcomes = await searchViaProviderManager(
      { topic: "test topic" },
      { providerIds: ["tavily", "brave"], policy: FAST_POLICY }
    );

    expect(braveSearch).not.toHaveBeenCalled();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].result.providerId).toBe("tavily");
  });

  it("retries a provider once on a retryable failure before giving up", async () => {
    const tavilySearch = vi
      .fn<ResearchProvider["search"]>()
      .mockResolvedValueOnce(buildResult({ status: "error" }))
      .mockResolvedValueOnce(buildResult({ status: "ok", sources: [buildSource()] }));
    registerProviders([buildFakeProvider("tavily", "search_engine", tavilySearch)]);

    const outcomes = await searchViaProviderManager(
      { topic: "test topic" },
      { providerIds: ["tavily"], policy: FAST_POLICY }
    );

    expect(tavilySearch).toHaveBeenCalledTimes(2);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].result.status).toBe("ok");
  });

  it("marks a provider call as 'timeout' once it exceeds the outer timeout ceiling, regardless of how long the provider's own promise takes to settle", async () => {
    const tavilySearch = vi.fn(() => new Promise<ProviderResult>(() => {})); // never resolves
    registerProviders([buildFakeProvider("tavily", "search_engine", tavilySearch)]);

    const outcomes = await searchViaProviderManager(
      { topic: "test topic" },
      { providerIds: ["tavily"], policy: { timeoutMs: 20, maxRetries: 0, baseBackoffMs: 5 } }
    );

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].result.status).toBe("timeout");
  });

  it("runs an independent (non-chained) provider alongside a fallback chain, not gated behind it", async () => {
    const tavilySearch = vi.fn(async () => {
      await sleep(10);
      return buildResult({ providerId: "tavily", sources: [buildSource()] });
    });
    const crunchbaseSearch = vi.fn(async () =>
      buildResult({ providerId: "crunchbase", sources: [buildSource({ providerId: "crunchbase" })] })
    );
    registerProviders([
      buildFakeProvider("tavily", "search_engine", tavilySearch),
      buildFakeProvider("crunchbase", "business_database", crunchbaseSearch),
    ]);

    const outcomes = await searchViaProviderManager(
      { topic: "test topic" },
      { providerIds: ["tavily", "crunchbase"], policy: FAST_POLICY }
    );

    const providerIds = outcomes.map((outcome) => outcome.result.providerId).sort();
    expect(providerIds).toEqual(["crunchbase", "tavily"]);
  });

  it("restricts the search to only the requested providerIds, never querying an unrequested provider even if registered", async () => {
    const tavilySearch = vi.fn(async () => buildResult({ providerId: "tavily" }));
    const braveSearch = vi.fn(async () => buildResult({ providerId: "brave" }));
    const crunchbaseSearch = vi.fn(async () =>
      buildResult({ providerId: "crunchbase", sources: [buildSource({ providerId: "crunchbase" })] })
    );
    registerProviders([
      buildFakeProvider("tavily", "search_engine", tavilySearch),
      buildFakeProvider("brave", "search_engine", braveSearch),
      buildFakeProvider("crunchbase", "business_database", crunchbaseSearch),
    ]);

    const outcomes = await searchViaProviderManager(
      { topic: "test topic" },
      { providerIds: ["crunchbase"], policy: FAST_POLICY }
    );

    expect(tavilySearch).not.toHaveBeenCalled();
    expect(braveSearch).not.toHaveBeenCalled();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].result.providerId).toBe("crunchbase");
  });
});
