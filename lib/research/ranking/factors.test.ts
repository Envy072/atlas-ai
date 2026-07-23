import { describe, it, expect } from "vitest";
import { scoreFreshness, scoreRelevance } from "@/lib/research/ranking/factors";
import type { Source } from "@/lib/research/schemas/source.schema";
import type { RankingContext } from "@/lib/research/types/ranking";

// Milestone 99 — scoreFreshness and scoreRelevance are real as of this
// milestone; scoreAuthority/scoreTrust/scoreSourceQuality remain
// untested, unchanged placeholders, deliberately out of scope.

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "A subscription scheduling tool market analysis",
    url: "https://example.com/a",
    domain: "example.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

const context: RankingContext = { topic: "subscription scheduling tool" };

describe("scoreFreshness", () => {
  it("scores a source published right now at 100", () => {
    const source = buildSource({ publishedAt: new Date().toISOString() });
    expect(scoreFreshness(source, context)).toBe(100);
  });

  it("scores a source published 180 days ago at the one-decay-constant value (~37)", () => {
    const publishedAt = new Date(Date.now() - 180 * 86_400_000).toISOString();
    const source = buildSource({ publishedAt });
    expect(scoreFreshness(source, context)).toBe(37);
  });

  it("scores an older source lower than a newer one", () => {
    const newer = buildSource({ publishedAt: new Date(Date.now() - 10 * 86_400_000).toISOString() });
    const older = buildSource({ publishedAt: new Date(Date.now() - 300 * 86_400_000).toISOString() });

    expect(scoreFreshness(newer, context)).toBeGreaterThan(scoreFreshness(older, context));
  });

  it("returns the neutral placeholder (50) when publishedAt is absent", () => {
    const source = buildSource({ publishedAt: undefined });
    expect(scoreFreshness(source, context)).toBe(50);
  });
});

describe("scoreRelevance", () => {
  it("scores full topic/source token overlap at 100", () => {
    const source = buildSource({ title: "Scheduling app market", snippet: "subscription tool analysis" });
    expect(scoreRelevance(source, context)).toBe(100);
  });

  it("scores zero overlap at 0", () => {
    const source = buildSource({ title: "Completely unrelated content", snippet: "nothing matches here" });
    expect(scoreRelevance(source, context)).toBe(0);
  });

  it("scores partial overlap proportionally", () => {
    const source = buildSource({ title: "Scheduling only", snippet: "" });
    expect(scoreRelevance(source, context)).toBe(33);
  });
});
