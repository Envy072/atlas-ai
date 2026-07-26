import { describe, it, expect } from "vitest";
import { resolveCompetitorKnowledge } from "@/lib/competitors/knowledge/competitorResolver";
import { MemoryCompetitorStore } from "@/lib/competitors/storage/memoryStore";
import type { DiscoveredCompetitor } from "@/lib/competitors/schemas/discovery.schema";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

function buildCandidate(overrides: Partial<DiscoveredCompetitor> = {}): DiscoveredCompetitor {
  return {
    candidateName: "Acme",
    sources: [],
    evidence: [],
    confidence: 60,
    ...overrides,
  };
}

function buildExistingProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: "company_existing",
    name: "Acme",
    aliases: [],
    features: [],
    technology: [],
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
    sources: [],
    evidence: [],
    confidence: 40,
    refresh: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "high",
    },
    ...overrides,
  };
}

// Milestone 54 — verifies this file's actual, current composition logic:
// a real MemoryCompetitorStore is used (no mocking needed, since it's
// already a genuine implementation), covering the new-vs-matched branch,
// the alias-recording condition, and the batch-aware dedup this file's own
// comment calls out as its one piece of genuinely new logic.
//
// Milestone 116 — every lookup/match is scoped by `analysisId`, not
// global (Milestone 114's Critical Finding #1: two unrelated analyses
// could fuzzy-match onto the same stored company). Every test below
// passes an explicit analysisId; the dedicated "cross-analysis
// isolation" block proves two different analysisIds discovering the
// identical candidate name never merge.
describe("resolveCompetitorKnowledge", () => {
  it("builds a brand-new profile, stamped with analysisId, when no existing profile matches the candidate", async () => {
    const store = new MemoryCompetitorStore();
    const result = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme" })],
      "analysis-1",
      store
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Acme");
    expect(result[0].analysisId).toBe("analysis-1");
    expect(result[0].refresh.refreshReason).toBe("initial_discovery");
  });

  it("persists the resolved profile into the given store", async () => {
    const store = new MemoryCompetitorStore();
    const [resolved] = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme" })],
      "analysis-1",
      store
    );

    await expect(store.getById(resolved.id)).resolves.toMatchObject({ id: resolved.id });
  });

  it("merges into this SAME analysis's own prior profile when the candidate matches one already resolved for it", async () => {
    const store = new MemoryCompetitorStore();
    await store.upsert(
      buildExistingProfile({ id: "company_existing", name: "Acme", analysisId: "analysis-1" })
    );

    const [resolved] = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme", confidence: 90 })],
      "analysis-1",
      store
    );

    expect(resolved.id).toBe("company_existing");
    expect(resolved.analysisId).toBe("analysis-1");
    expect(resolved.confidence).toBe(90);
  });

  it("records the candidate's name as a new alias when it differs from the matched profile's name", async () => {
    const store = new MemoryCompetitorStore();
    await store.upsert(
      buildExistingProfile({ id: "company_existing", name: "Acme", aliases: [], analysisId: "analysis-1" })
    );

    const [resolved] = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme Inc" })],
      "analysis-1",
      store
    );

    expect(resolved.aliases).toContain("Acme Inc");
  });

  it("does not duplicate an alias that's already known", async () => {
    const store = new MemoryCompetitorStore();
    await store.upsert(
      buildExistingProfile({
        id: "company_existing",
        name: "Acme",
        aliases: ["Acme Inc"],
        analysisId: "analysis-1",
      })
    );

    const [resolved] = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme Inc" })],
      "analysis-1",
      store
    );

    expect(resolved.aliases).toEqual(["Acme Inc"]);
  });

  it("resolves two same-company candidates within a single batch to one profile", async () => {
    const store = new MemoryCompetitorStore();

    const result = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme" }), buildCandidate({ candidateName: "Acme" })],
      "analysis-1",
      store
    );

    expect(result).toHaveLength(1);
    const allStored = await store.list("analysis-1");
    expect(allStored).toHaveLength(1);
  });

  it("resolves unrelated candidates to separate profiles", async () => {
    const store = new MemoryCompetitorStore();

    const result = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme" }), buildCandidate({ candidateName: "HubSpot" })],
      "analysis-1",
      store
    );

    expect(result).toHaveLength(2);
  });

  it("defaults to the shared defaultCompetitorStore when no store is given", async () => {
    const result = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Default Store Co" })],
      "analysis-default-store-test"
    );
    expect(result).toHaveLength(1);
    expect(result[0].analysisId).toBe("analysis-default-store-test");
  });

  // Milestone 116 — the actual regression this milestone exists to add.
  describe("cross-analysis isolation", () => {
    it("never merges two different analyses' companies, even when the exact same candidate name is discovered by both", async () => {
      const store = new MemoryCompetitorStore();
      await store.upsert(
        buildExistingProfile({
          id: "company_analysis_a",
          name: "Acme",
          confidence: 40,
          analysisId: "analysis-a",
        })
      );

      const result = await resolveCompetitorKnowledge(
        [buildCandidate({ candidateName: "Acme", confidence: 95 })],
        "analysis-b",
        store
      );

      // Resolving for analysis-b must never find, merge into, or
      // overwrite analysis-a's own "Acme" profile — it gets its own,
      // brand-new record, even though the candidate name is identical.
      expect(result).toHaveLength(1);
      expect(result[0].id).not.toBe("company_analysis_a");
      expect(result[0].analysisId).toBe("analysis-b");

      const analysisAProfile = await store.getById("company_analysis_a");
      expect(analysisAProfile?.confidence).toBe(40);
    });

    it("scopes findByName itself so the same name never resolves across analyses", async () => {
      const store = new MemoryCompetitorStore();
      await store.upsert(buildExistingProfile({ id: "company_1", name: "Acme", analysisId: "analysis-a" }));

      await expect(store.findByName("Acme", "analysis-a")).resolves.toMatchObject({ id: "company_1" });
      await expect(store.findByName("Acme", "analysis-b")).resolves.toBeNull();
    });

    it("scopes list itself so one analysis's companies are invisible to another's resolution batch", async () => {
      const store = new MemoryCompetitorStore();
      await store.upsert(buildExistingProfile({ id: "company_1", name: "Acme", analysisId: "analysis-a" }));
      await store.upsert(buildExistingProfile({ id: "company_2", name: "HubSpot", analysisId: "analysis-b" }));

      const scopedToA = await store.list("analysis-a");
      expect(scopedToA.map((profile) => profile.id)).toEqual(["company_1"]);
    });
  });
});
