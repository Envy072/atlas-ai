import { describe, it, expect } from "vitest";
import { rankSources } from "@/lib/research/ranking/rankingEngine";
import type { Source } from "@/lib/research/schemas/source.schema";
import type { RankingContext } from "@/lib/research/types/ranking";

// The first test of rankSources()'s real composition path. Milestone 99
// made relevance and freshness real; authority/trust/sourceQuality
// remain flat placeholders, contributing an identical constant to every
// source's score — so this test proves the outcome that actually
// matters (which source ranks first) is already fully real, using only
// the two now-real factors, without needing the other three to be real
// too (Cohesion Verification, Milestone 99).

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "A subscription scheduling tool",
    url: "https://example.com/a",
    domain: "example.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

describe("rankSources", () => {
  it("ranks a more relevant, fresher source above a less relevant, staler one", () => {
    const context: RankingContext = { topic: "subscription scheduling tool" };

    const strong = buildSource({
      id: "strong",
      title: "Subscription scheduling tool for teams",
      snippet: "",
      publishedAt: new Date().toISOString(),
    });
    const weak = buildSource({
      id: "weak",
      url: "https://example.com/b",
      title: "Completely unrelated gardening content",
      snippet: "nothing about this matches",
      publishedAt: new Date(Date.now() - 400 * 86_400_000).toISOString(),
    });

    const [first, second] = rankSources([weak, strong], context);

    expect(first.id).toBe("strong");
    expect(second.id).toBe("weak");
  });

  it("returns an empty array for an empty source list", () => {
    expect(rankSources([], { topic: "anything" })).toEqual([]);
  });
});
