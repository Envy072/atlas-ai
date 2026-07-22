import { describe, it, expect } from "vitest";
import { aggregateEvidence } from "@/lib/decision/evidence/evidenceAggregator";
import type { Source, Evidence } from "@/lib/research";

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "Industry report",
    url: "https://example.com/report",
    domain: "example.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

function buildEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "evidence_1",
    claim: "The market is growing",
    evidence: "An industry report cites double-digit growth.",
    confidence: 70,
    source: buildSource(),
    url: "https://example.com/report",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("aggregateEvidence", () => {
  it("flattens multiple source and evidence lists into one of each", () => {
    const sourceA = buildSource({ id: "source_a", url: "https://a.com" });
    const sourceB = buildSource({ id: "source_b", url: "https://b.com" });
    const evidenceA = buildEvidence({ id: "evidence_a", url: "https://a.com/evidence" });
    const evidenceB = buildEvidence({ id: "evidence_b", url: "https://b.com/evidence" });

    const result = aggregateEvidence([[sourceA], [sourceB]], [[evidenceA], [evidenceB]]);

    expect(result.sources).toEqual([sourceA, sourceB]);
    expect(result.evidence).toEqual([evidenceA, evidenceB]);
  });

  it("dedupes sources by URL, keeping the first occurrence", () => {
    const first = buildSource({ id: "source_first", url: "https://duplicate.com" });
    const second = buildSource({ id: "source_second", url: "https://duplicate.com" });

    const result = aggregateEvidence([[first], [second]], [[]]);

    expect(result.sources).toEqual([first]);
  });

  it("dedupes evidence by URL, keeping the first occurrence", () => {
    const first = buildEvidence({ id: "evidence_first", url: "https://duplicate.com/evidence" });
    const second = buildEvidence({ id: "evidence_second", url: "https://duplicate.com/evidence" });

    const result = aggregateEvidence([[]], [[first], [second]]);

    expect(result.evidence).toEqual([first]);
  });

  it("dedupes sources and evidence independently of each other", () => {
    const duplicateSourceA = buildSource({ id: "source_a", url: "https://duplicate.com" });
    const duplicateSourceB = buildSource({ id: "source_b", url: "https://duplicate.com" });
    const evidenceA = buildEvidence({ id: "evidence_a", url: "https://unique-a.com" });
    const evidenceB = buildEvidence({ id: "evidence_b", url: "https://unique-b.com" });

    const result = aggregateEvidence([[duplicateSourceA, duplicateSourceB]], [[evidenceA, evidenceB]]);

    expect(result.sources).toEqual([duplicateSourceA]);
    expect(result.evidence).toEqual([evidenceA, evidenceB]);
  });

  it("returns empty lists when given only empty input lists", () => {
    const result = aggregateEvidence([[], []], [[]]);

    expect(result.sources).toEqual([]);
    expect(result.evidence).toEqual([]);
  });

  it("returns empty lists when given no lists at all", () => {
    const result = aggregateEvidence([], []);

    expect(result.sources).toEqual([]);
    expect(result.evidence).toEqual([]);
  });
});
