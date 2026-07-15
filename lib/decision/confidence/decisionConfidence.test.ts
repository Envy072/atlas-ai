import { describe, it, expect, vi, afterEach } from "vitest";
import { computeDecisionConfidence } from "@/lib/decision/confidence/decisionConfidence";
import type { CoverageChecklist } from "@/lib/decision";
import type { Source, Evidence } from "@/lib/research";

// The representative knowledge-platform test (MILESTONE_30_DESIGN.md
// Deliverable 6) — the template a future milestone repeats for the
// other five platforms. Every input below is a fact this codebase
// already treats as real (a checklist item is present or it isn't; an
// evidence item has a real confidence and retrievedAt) — nothing here
// is a fabricated placeholder, matching decisionConfidence.ts's own
// "real, deterministic composition" doc comment.

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source-1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "A source",
    url: "https://example.com/a",
    domain: "example.com",
    retrievedAt: new Date().toISOString(),
    confidence: 80,
    ...overrides,
  };
}

function buildEvidence(overrides: Partial<Evidence> = {}): Evidence {
  const source = buildSource();
  return {
    id: "evidence-1",
    claim: "A claim.",
    evidence: "Supporting text.",
    confidence: 80,
    source,
    url: source.url,
    retrievedAt: source.retrievedAt,
    ...overrides,
  };
}

function emptyChecklist(): CoverageChecklist {
  return {
    hasBusinessModel: false,
    hasValueProposition: false,
    hasCustomerProblem: false,
    hasMarketIndustry: false,
    hasFundingStage: false,
    hasFindings: false,
    hasCriticalRisks: false,
    hasEvidence: false,
    hasCompetitorProfiles: false,
    hasMarketProfile: false,
  };
}

function fullChecklist(): CoverageChecklist {
  return {
    hasBusinessModel: true,
    hasValueProposition: true,
    hasCustomerProblem: true,
    hasMarketIndustry: true,
    hasFundingStage: true,
    hasFindings: true,
    hasCriticalRisks: true,
    hasEvidence: true,
    hasCompetitorProfiles: true,
    hasMarketProfile: true,
  };
}

describe("computeDecisionConfidence — coverage", () => {
  it("is 100 (unknownPercentage 0) when every checklist item is true", () => {
    const result = computeDecisionConfidence({ sources: [], evidence: [], checklist: fullChecklist() });
    expect(result.coverage).toBe(100);
    expect(result.unknownPercentage).toBe(0);
  });

  it("is 0 (unknownPercentage 100) when every checklist item is false", () => {
    const result = computeDecisionConfidence({ sources: [], evidence: [], checklist: emptyChecklist() });
    expect(result.coverage).toBe(0);
    expect(result.unknownPercentage).toBe(100);
  });

  it("reflects a partial checklist proportionally (6 of 10 → 60%)", () => {
    const result = computeDecisionConfidence({
      sources: [],
      evidence: [],
      checklist: {
        ...emptyChecklist(),
        hasBusinessModel: true,
        hasValueProposition: true,
        hasCustomerProblem: true,
        hasMarketIndustry: true,
        hasFundingStage: true,
        hasFindings: true,
      },
    });
    expect(result.coverage).toBe(60);
    expect(result.unknownPercentage).toBe(40);
  });
});

describe("computeDecisionConfidence — evidenceConfidence", () => {
  it("is 0 for empty evidence — never fabricated", () => {
    const result = computeDecisionConfidence({ sources: [], evidence: [], checklist: emptyChecklist() });
    expect(result.evidenceConfidence).toBe(0);
  });

  it("averages the confidence of every evidence item", () => {
    const result = computeDecisionConfidence({
      sources: [],
      evidence: [buildEvidence({ confidence: 80 }), buildEvidence({ confidence: 90 })],
      checklist: emptyChecklist(),
    });
    expect(result.evidenceConfidence).toBe(85);
  });
});

// A fixed system time is required for every case here — dataFreshnessDays
// reads Date.now() internally, so this suite would be flaky by
// construction otherwise (MILESTONE_30_DESIGN.md Risks, "Flaky tests").
describe("computeDecisionConfidence — dataFreshnessDays", () => {
  const NOW = new Date("2026-07-15T12:00:00.000Z");
  const ONE_DAY_MS = 86_400_000;

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is undefined for empty sources — never a fabricated 0, which would falsely claim 'perfectly fresh'", () => {
    const result = computeDecisionConfidence({ sources: [], evidence: [], checklist: emptyChecklist() });
    expect(result.dataFreshnessDays).toBeUndefined();
  });

  it("averages the age in days of every source's retrievedAt", () => {
    vi.setSystemTime(NOW);

    const oneDayAgo = new Date(NOW.getTime() - 1 * ONE_DAY_MS).toISOString();
    const threeDaysAgo = new Date(NOW.getTime() - 3 * ONE_DAY_MS).toISOString();

    const result = computeDecisionConfidence({
      sources: [buildSource({ retrievedAt: oneDayAgo }), buildSource({ retrievedAt: threeDaysAgo })],
      evidence: [],
      checklist: emptyChecklist(),
    });

    expect(result.dataFreshnessDays).toBe(2);
  });

  it("treats an unparseable retrievedAt as age 0, not a thrown error or NaN", () => {
    vi.setSystemTime(NOW);

    const fourDaysAgo = new Date(NOW.getTime() - 4 * ONE_DAY_MS).toISOString();

    const result = computeDecisionConfidence({
      sources: [buildSource({ retrievedAt: fourDaysAgo }), buildSource({ retrievedAt: "not-a-real-date" })],
      evidence: [],
      checklist: emptyChecklist(),
    });

    expect(result.dataFreshnessDays).toBe(2);
  });
});
