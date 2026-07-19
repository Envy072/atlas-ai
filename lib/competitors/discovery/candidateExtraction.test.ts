import { describe, it, expect } from "vitest";
import { extractCandidateName } from "@/lib/competitors/discovery/candidateExtraction";
import type { Source } from "@/lib/research";

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "HubSpot",
    url: "https://www.hubspot.com",
    domain: "hubspot.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

// Milestone 53 — verifies this file's actual, current heuristic: split the
// source title on a dash/pipe/colon separator and take the first segment;
// fall back to a capitalized domain label only when the title yields
// nothing usable. This is a documented heuristic, not NLP-grade entity
// extraction, so tests confirm today's real splitting behavior rather
// than an idealized "correct" name every time.
describe("extractCandidateName", () => {
  it("returns the title as-is when it has no separator", () => {
    const source = buildSource({ title: "HubSpot" });
    expect(extractCandidateName(source)).toBe("HubSpot");
  });

  it("takes the first segment before a pipe separator", () => {
    const source = buildSource({ title: "HubSpot | Marketing, Sales, and Service Software" });
    expect(extractCandidateName(source)).toBe("HubSpot");
  });

  it("takes the first segment before a dash separator", () => {
    const source = buildSource({ title: "Acme - The best widgets on Earth" });
    expect(extractCandidateName(source)).toBe("Acme");
  });

  it("takes the first segment before a colon separator (whitespace required on both sides)", () => {
    const source = buildSource({ title: "Acme : Widgets for Everyone" });
    expect(extractCandidateName(source)).toBe("Acme");
  });

  it("does not split on a colon with no leading whitespace", () => {
    const source = buildSource({ title: "Acme: Widgets for Everyone" });
    expect(extractCandidateName(source)).toBe("Acme: Widgets for Everyone");
  });

  it("falls back to a capitalized domain label when the title is empty", () => {
    const source = buildSource({ title: "", url: "https://www.acme.com" });
    expect(extractCandidateName(source)).toBe("Acme");
  });

  it("falls back to a capitalized domain label when the title is only a separator", () => {
    const source = buildSource({ title: " - ", url: "https://www.acme.com" });
    expect(extractCandidateName(source)).toBe("Acme");
  });
});
