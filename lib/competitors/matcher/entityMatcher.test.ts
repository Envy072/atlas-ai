import { describe, it, expect } from "vitest";
import { matchCompanyName } from "@/lib/competitors/matcher/entityMatcher";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

function buildProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: "company_1",
    name: "HubSpot",
    aliases: [],
    features: [],
    technology: [],
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
    sources: [],
    evidence: [],
    confidence: 50,
    refresh: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "normal",
    },
    ...overrides,
  };
}

// Milestone 52 — verifies this file's actual, current two-pass matching
// behavior (exact normalized-name match, then Jaccard token overlap),
// including the real, easy-to-miss detail that the best-match tracking
// variable only updates on a strict `>` comparison — a candidate whose
// very first scored profile ties the initial bestScore of 0 never sets
// bestProfile, so it stays unmatched regardless of threshold.
describe("matchCompanyName", () => {
  it("matches an exact name (case/whitespace-insensitive)", () => {
    const result = matchCompanyName("hubspot", [buildProfile({ name: "HubSpot" })]);

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(100);
    expect(result.matchedCompanyId).toBe("company_1");
  });

  it("matches when only a legal suffix differs", () => {
    const result = matchCompanyName("HubSpot, Inc.", [buildProfile({ name: "HubSpot" })]);

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(100);
  });

  it("matches when only spacing differs (collapsed-form check)", () => {
    const result = matchCompanyName("Hub Spot", [buildProfile({ name: "HubSpot" })]);

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(100);
  });

  it("does not match a completely unrelated name (zero token overlap)", () => {
    const result = matchCompanyName("Salesforce", [buildProfile({ name: "HubSpot" })]);

    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("does not match at the default threshold but does at a lower custom threshold", () => {
    // "Acme Corp" normalizes to "acme" (legal suffix stripped); "Acme
    // Ventures" normalizes to "acme ventures" (no suffix stripped) —
    // token sets {"acme"} vs {"acme","ventures"} share 1 of 2 tokens,
    // a real, traced-through Jaccard score of 50.
    const candidates = [buildProfile({ name: "Acme Ventures" })];

    const defaultResult = matchCompanyName("Acme Corp", candidates);
    expect(defaultResult.matched).toBe(false);
    expect(defaultResult.confidence).toBe(50);

    const lenientResult = matchCompanyName("Acme Corp", candidates, { matchThreshold: 40 });
    expect(lenientResult.matched).toBe(true);
    expect(lenientResult.confidence).toBe(50);
  });

  it("matches against an alias, not just the primary name", () => {
    const result = matchCompanyName("Hub Spot Inc", [buildProfile({ name: "HubSpot", aliases: ["Hub Spot Inc"] })]);

    expect(result.matched).toBe(true);
  });

  it("returns matched: false with an explanatory reason for an empty profile list", () => {
    const result = matchCompanyName("HubSpot", []);

    expect(result.matched).toBe(false);
    expect(result.reason).toBe("No existing profiles to compare against.");
  });
});
