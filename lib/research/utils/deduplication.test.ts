import { describe, it, expect } from "vitest";
import { dedupeSources } from "@/lib/research/utils/deduplication";
import type { Source } from "@/lib/research/schemas/source.schema";

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

describe("dedupeSources", () => {
  it("keeps only the first occurrence when two sources normalize to the same URL", () => {
    const first = buildSource({ id: "source_1", url: "https://Example.com/post/?utm_source=x" });
    const second = buildSource({ id: "source_2", title: "A different title", url: "https://example.com/post" });

    const result = dedupeSources([first, second]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("source_1");
  });

  it("keeps both sources when their URLs are genuinely different", () => {
    const first = buildSource({ id: "source_1", url: "https://example.com/one" });
    const second = buildSource({ id: "source_2", url: "https://example.com/two" });

    const result = dedupeSources([first, second]);

    expect(result).toHaveLength(2);
    expect(result.map((source) => source.id)).toEqual(["source_1", "source_2"]);
  });

  it("returns an empty array for empty input", () => {
    expect(dedupeSources([])).toEqual([]);
  });
});
