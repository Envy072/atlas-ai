import { describe, it, expect } from "vitest";
import { buildCompanyProfile } from "@/lib/competitors/knowledge/companyProfileBuilder";

// Milestone 52 — verifies this file's actual, current behavior: every
// field beyond name/confidence starts empty/undefined, never guessed.
describe("buildCompanyProfile", () => {
  it("defaults every optional field to empty/undefined for a minimal input", () => {
    const profile = buildCompanyProfile({ name: "Acme", confidence: 40 });

    expect(profile.name).toBe("Acme");
    expect(profile.aliases).toEqual([]);
    expect(profile.website).toBeUndefined();
    expect(profile.features).toEqual([]);
    expect(profile.technology).toEqual([]);
    expect(profile.strengths).toEqual([]);
    expect(profile.weaknesses).toEqual([]);
    expect(profile.opportunities).toEqual([]);
    expect(profile.threats).toEqual([]);
    expect(profile.sources).toEqual([]);
    expect(profile.evidence).toEqual([]);
    expect(profile.confidence).toBe(40);
  });

  it("threads through every provided optional field", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const profile = buildCompanyProfile({
      name: "Acme",
      aliases: ["Acme Inc"],
      website: "https://acme.com",
      confidence: 60,
      now,
    });

    expect(profile.aliases).toEqual(["Acme Inc"]);
    expect(profile.website).toBe("https://acme.com");
    expect(profile.refresh.lastUpdated).toBe(now.toISOString());
  });

  it("sets refresh.refreshReason to 'initial_discovery'", () => {
    const profile = buildCompanyProfile({ name: "Acme", confidence: 50 });
    expect(profile.refresh.refreshReason).toBe("initial_discovery");
  });

  it("generates a unique id on every call", () => {
    const a = buildCompanyProfile({ name: "Acme", confidence: 50 });
    const b = buildCompanyProfile({ name: "Acme", confidence: 50 });
    expect(a.id).not.toBe(b.id);
  });

  it("defaults `now` to the current time when omitted", () => {
    const before = Date.now();
    const profile = buildCompanyProfile({ name: "Acme", confidence: 50 });
    const after = Date.now();

    const lastUpdatedMs = Date.parse(profile.refresh.lastUpdated);
    expect(lastUpdatedMs).toBeGreaterThanOrEqual(before);
    expect(lastUpdatedMs).toBeLessThanOrEqual(after);
  });
});
