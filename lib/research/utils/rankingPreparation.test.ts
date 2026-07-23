import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSourceAgeInDays, getTopicOverlapRatio } from "@/lib/research/utils/rankingPreparation";
import type { Source } from "@/lib/research/schemas/source.schema";

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

describe("getSourceAgeInDays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when publishedAt is absent", () => {
    expect(getSourceAgeInDays(buildSource({ publishedAt: undefined }))).toBeNull();
  });

  it("returns null for an unparseable publishedAt", () => {
    expect(getSourceAgeInDays(buildSource({ publishedAt: "not-a-date" }))).toBeNull();
  });

  it("returns the real age in days for a real publishedAt", () => {
    const source = buildSource({ publishedAt: "2025-12-02T00:00:00.000Z" });
    expect(getSourceAgeInDays(source)).toBe(30);
  });

  it("never returns a negative age for a publishedAt in the future", () => {
    const source = buildSource({ publishedAt: "2026-02-01T00:00:00.000Z" });
    expect(getSourceAgeInDays(source)).toBe(0);
  });
});

describe("getTopicOverlapRatio", () => {
  it("returns 1 when every significant topic token appears in the source", () => {
    const source = buildSource({ title: "Scheduling app market", snippet: "subscription tool analysis" });
    expect(getTopicOverlapRatio("subscription scheduling tool", source)).toBe(1);
  });

  it("returns 0 when no topic token appears in the source", () => {
    const source = buildSource({ title: "Completely unrelated content", snippet: "nothing matches here" });
    expect(getTopicOverlapRatio("subscription scheduling tool", source)).toBe(0);
  });

  it("returns a partial ratio for partial overlap", () => {
    const source = buildSource({ title: "Scheduling only", snippet: "" });
    expect(getTopicOverlapRatio("subscription scheduling tool", source)).toBeCloseTo(1 / 3, 5);
  });

  it("returns 0 when the topic has no significant tokens", () => {
    expect(getTopicOverlapRatio("", buildSource())).toBe(0);
  });
});
