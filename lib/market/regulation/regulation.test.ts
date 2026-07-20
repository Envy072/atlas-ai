import { describe, it, expect } from "vitest";
import { buildRegulation } from "@/lib/market/regulation/regulation";

// Milestone 72 — verifies this file's actual, current construction
// behavior: buildRegulation is the one place a real Regulation gets
// constructed and schema-validated; `name` is required, the rest
// (including `jurisdiction`) independently optional.
describe("buildRegulation", () => {
  it("threads through every provided field", () => {
    const regulation = buildRegulation({
      name: "Data Privacy Law",
      jurisdiction: "European Union",
      description: "Requires explicit consent for processing personal data.",
      severity: "high",
    });

    expect(regulation).toEqual({
      name: "Data Privacy Law",
      jurisdiction: "European Union",
      description: "Requires explicit consent for processing personal data.",
      severity: "high",
    });
  });

  it("requires only `name`, leaving the rest undefined otherwise", () => {
    const regulation = buildRegulation({ name: "Data Privacy Law" });

    expect(regulation.name).toBe("Data Privacy Law");
    expect(regulation.jurisdiction).toBeUndefined();
    expect(regulation.description).toBeUndefined();
    expect(regulation.severity).toBeUndefined();
  });

  it("threads through jurisdiction independently of the other optional fields", () => {
    const regulation = buildRegulation({ name: "Data Privacy Law", jurisdiction: "European Union" });

    expect(regulation.jurisdiction).toBe("European Union");
    expect(regulation.description).toBeUndefined();
    expect(regulation.severity).toBeUndefined();
  });
});
