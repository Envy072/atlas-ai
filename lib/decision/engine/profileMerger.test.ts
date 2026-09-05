import { describe, it, expect } from "vitest";
import { buildDecisionProfileFixture } from "@/tests/fixtures";
import { mergeDecisionProfile } from "@/lib/decision/engine/profileMerger";
import { buildFinding } from "@/lib/decision/findings/findingBuilder";
import { buildRiskFinding } from "@/lib/decision/redflags/riskFinding";
import { buildEvidence } from "@/lib/research/evidence/evidenceBuilder";
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

describe("mergeDecisionProfile", () => {
  it("unions findings by id — keeping an existing one, adding a new one, never duplicating a repeated id", () => {
    const existingFinding = buildFinding({
      category: "market",
      severity: "medium",
      summary: "Existing finding.",
      confidence: 70,
    });
    const existing = buildDecisionProfileFixture({ keyFindings: [existingFinding] });

    const repeatedFinding = { ...existingFinding, summary: "A stale re-send of the same finding." };
    const newFinding = buildFinding({
      category: "financial",
      severity: "high",
      summary: "A genuinely new finding.",
      confidence: 60,
    });

    const merged = mergeDecisionProfile(existing, { keyFindings: [repeatedFinding, newFinding] });

    expect(merged.keyFindings).toHaveLength(2);
    expect(merged.keyFindings.map((f) => f.id).sort()).toEqual(
      [existingFinding.id, newFinding.id].sort()
    );
    // First-seen wins on an id collision — the existing finding's own
    // summary survives, not the incoming "stale re-send" duplicate.
    expect(merged.keyFindings.find((f) => f.id === existingFinding.id)?.summary).toBe(
      "Existing finding."
    );
  });

  it("unions critical risks by id the same way, never duplicating a repeated id", () => {
    const riskSource = buildSource({ id: "source_risk" });
    const riskEvidence = [
      buildEvidence({ claim: "Risk claim", evidence: "Risk evidence text", confidence: 70, source: riskSource }),
    ];
    const existingRisk = buildRiskFinding({
      category: "legal",
      severity: "high",
      summary: "Existing risk.",
      evidence: riskEvidence,
      confidence: 65,
    });
    const existing = buildDecisionProfileFixture({ criticalRisks: [existingRisk] });

    const repeatedRisk = { ...existingRisk, summary: "A stale re-send of the same risk." };
    const newRisk = buildRiskFinding({
      category: "operations",
      severity: "critical",
      summary: "A genuinely new risk.",
      evidence: riskEvidence,
      confidence: 80,
    });

    const merged = mergeDecisionProfile(existing, { criticalRisks: [repeatedRisk, newRisk] });

    expect(merged.criticalRisks).toHaveLength(2);
    expect(merged.criticalRisks.map((r) => r.id).sort()).toEqual([existingRisk.id, newRisk.id].sort());
    expect(merged.criticalRisks.find((r) => r.id === existingRisk.id)?.summary).toBe("Existing risk.");
  });

  it("unions sources/evidence by normalized URL, deduplicating a cross-run repeat and keeping a genuinely new one", () => {
    const existingSource = buildSource({ id: "source_existing", url: "https://example.com/shared" });
    const existingEvidence = buildEvidence({
      claim: "Existing claim",
      evidence: "Existing evidence text",
      confidence: 80,
      source: existingSource,
    });
    const existing = buildDecisionProfileFixture({
      sources: [existingSource],
      evidence: [existingEvidence],
    });

    const repeatedSource = buildSource({ id: "source_repeat", url: "https://example.com/shared" });
    const newSource = buildSource({ id: "source_new", url: "https://example.com/unique" });
    const newEvidence = buildEvidence({
      claim: "New claim",
      evidence: "New evidence text",
      confidence: 75,
      source: newSource,
    });

    const merged = mergeDecisionProfile(existing, {
      sources: [repeatedSource, newSource],
      evidence: [newEvidence],
    });

    expect(merged.sources).toHaveLength(2);
    expect(merged.sources.map((s) => s.url).sort()).toEqual([
      "https://example.com/shared",
      "https://example.com/unique",
    ]);
    expect(merged.sources.find((s) => s.url === "https://example.com/shared")?.id).toBe(
      "source_existing"
    );
    expect(merged.evidence).toHaveLength(2);
  });

  it("unions plain string arrays without duplicating an identical existing entry", () => {
    const existing = buildDecisionProfileFixture({ strengths: ["Strong founding team"] });

    const merged = mergeDecisionProfile(existing, {
      strengths: ["Strong founding team", "Good market timing"],
    });

    expect(merged.strengths).toEqual(["Strong founding team", "Good market timing"]);
  });

  it("recomputes confidenceSummary from the merged evidence rather than carrying over the existing profile's stale value", () => {
    const existing = buildDecisionProfileFixture({ sources: [], evidence: [] });
    const newSource = buildSource();
    const newEvidence = buildEvidence({
      claim: "New claim",
      evidence: "New evidence text",
      confidence: 90,
      source: newSource,
    });

    const merged = mergeDecisionProfile(existing, { sources: [newSource], evidence: [newEvidence] });

    expect(merged.confidenceSummary).not.toEqual(existing.confidenceSummary);
    expect(merged.confidenceSummary.evidenceConfidence).toBeGreaterThan(
      existing.confidenceSummary.evidenceConfidence
    );
  });
});
