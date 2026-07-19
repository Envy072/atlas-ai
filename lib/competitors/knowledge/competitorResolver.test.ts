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
describe("resolveCompetitorKnowledge", () => {
  it("builds a brand-new profile when no existing profile matches the candidate", async () => {
    const store = new MemoryCompetitorStore();
    const result = await resolveCompetitorKnowledge([buildCandidate({ candidateName: "Acme" })], store);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Acme");
    expect(result[0].refresh.refreshReason).toBe("initial_discovery");
  });

  it("persists the resolved profile into the given store", async () => {
    const store = new MemoryCompetitorStore();
    const [resolved] = await resolveCompetitorKnowledge([buildCandidate({ candidateName: "Acme" })], store);

    await expect(store.getById(resolved.id)).resolves.toMatchObject({ id: resolved.id });
  });

  it("merges into an existing profile when the candidate matches one already in the store", async () => {
    const store = new MemoryCompetitorStore();
    await store.upsert(buildExistingProfile({ id: "company_existing", name: "Acme" }));

    const [resolved] = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme", confidence: 90 })],
      store
    );

    expect(resolved.id).toBe("company_existing");
    expect(resolved.confidence).toBe(90);
  });

  it("records the candidate's name as a new alias when it differs from the matched profile's name", async () => {
    const store = new MemoryCompetitorStore();
    await store.upsert(buildExistingProfile({ id: "company_existing", name: "Acme", aliases: [] }));

    const [resolved] = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme Inc" })],
      store
    );

    expect(resolved.aliases).toContain("Acme Inc");
  });

  it("does not duplicate an alias that's already known", async () => {
    const store = new MemoryCompetitorStore();
    await store.upsert(buildExistingProfile({ id: "company_existing", name: "Acme", aliases: ["Acme Inc"] }));

    const [resolved] = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme Inc" })],
      store
    );

    expect(resolved.aliases).toEqual(["Acme Inc"]);
  });

  it("resolves two same-company candidates within a single batch to one profile", async () => {
    const store = new MemoryCompetitorStore();

    const result = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme" }), buildCandidate({ candidateName: "Acme" })],
      store
    );

    expect(result).toHaveLength(1);
    const allStored = await store.list();
    expect(allStored).toHaveLength(1);
  });

  it("resolves unrelated candidates to separate profiles", async () => {
    const store = new MemoryCompetitorStore();

    const result = await resolveCompetitorKnowledge(
      [buildCandidate({ candidateName: "Acme" }), buildCandidate({ candidateName: "HubSpot" })],
      store
    );

    expect(result).toHaveLength(2);
  });

  it("defaults to the shared defaultCompetitorStore when no store is given", async () => {
    const result = await resolveCompetitorKnowledge([buildCandidate({ candidateName: "Default Store Co" })]);
    expect(result).toHaveLength(1);
  });
});
