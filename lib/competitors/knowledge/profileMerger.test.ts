import { describe, it, expect } from "vitest";
import { mergeCompanyProfile } from "@/lib/competitors/knowledge/profileMerger";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { Source } from "@/lib/research";

function buildExistingProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: "company_1",
    name: "Acme",
    aliases: ["Acme Inc"],
    features: ["Feature A"],
    technology: ["React"],
    strengths: ["Strong brand"],
    weaknesses: ["Slow support"],
    opportunities: ["New market"],
    threats: ["New entrant"],
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

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "Acme homepage",
    url: "https://acme.com",
    domain: "acme.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

// Milestone 52 — verifies this file's actual, current merge behavior:
// list-field union with exact-string dedup, scalar override-vs-fallback,
// URL-based source/evidence dedup (via lib/shared's own urlDedupeKey,
// confirmed behaviorally identical at Milestone 51), confidence always
// taking the incoming value, and refresh metadata always recomputed
// with reason "scheduled".
describe("mergeCompanyProfile", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");

  it("unions list fields, deduplicating exact-string duplicates", () => {
    const existing = buildExistingProfile({ features: ["Feature A"] });
    const merged = mergeCompanyProfile(existing, { features: ["Feature A", "Feature B"], confidence: 50 }, now);

    expect(merged.features).toEqual(["Feature A", "Feature B"]);
  });

  it("preserves both items when list-field values genuinely differ", () => {
    const existing = buildExistingProfile({ strengths: ["Strong brand"] });
    const merged = mergeCompanyProfile(existing, { strengths: ["Great support"], confidence: 50 }, now);

    expect(merged.strengths).toEqual(["Strong brand", "Great support"]);
  });

  it("overrides a scalar field when incoming provides it", () => {
    const existing = buildExistingProfile({ website: "https://old.com" });
    const merged = mergeCompanyProfile(existing, { website: "https://new.com", confidence: 50 }, now);

    expect(merged.website).toBe("https://new.com");
  });

  it("falls back to the existing scalar value when incoming omits it", () => {
    const existing = buildExistingProfile({ website: "https://old.com" });
    const merged = mergeCompanyProfile(existing, { confidence: 50 }, now);

    expect(merged.website).toBe("https://old.com");
  });

  it("dedupes sources by URL (case/trailing-slash insensitive)", () => {
    const existing = buildExistingProfile({ sources: [buildSource({ url: "https://acme.com" })] });
    const merged = mergeCompanyProfile(
      existing,
      { sources: [buildSource({ id: "source_2", url: "https://ACME.com/" })], confidence: 50 },
      now
    );

    expect(merged.sources).toHaveLength(1);
  });

  it("always takes the incoming confidence value", () => {
    const existing = buildExistingProfile({ confidence: 40 });
    const merged = mergeCompanyProfile(existing, { confidence: 90 }, now);

    expect(merged.confidence).toBe(90);
  });

  it("recomputes refresh metadata with reason 'scheduled' from the incoming confidence", () => {
    const existing = buildExistingProfile();
    const merged = mergeCompanyProfile(existing, { confidence: 10 }, now);

    expect(merged.refresh.refreshReason).toBe("scheduled");
    expect(merged.refresh.refreshPriority).toBe("urgent");
    expect(merged.refresh.lastUpdated).toBe(now.toISOString());
  });
});
