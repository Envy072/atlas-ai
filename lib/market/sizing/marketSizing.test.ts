import { describe, it, expect } from "vitest";
import { buildMarketSizing } from "@/lib/market/sizing/marketSizing";

// Milestone 61 — sizing/marketSizing.ts's estimateTAM/SAM/SOM are
// "ARCHITECTURE ONLY, NO FAKE CALCULATIONS" placeholders (excluded from
// direct testing, per this project's established precedent for such
// functions). buildMarketSizing() is the currently implemented
// composition function that assembles them — these tests verify its
// real, current assembly behavior.
describe("buildMarketSizing", () => {
  it("assembles tam/sam/som, each an honest 'not yet computed' estimate", () => {
    const sizing = buildMarketSizing({ industry: "fintech" });

    expect(sizing.tam.valueUsd).toBeUndefined();
    expect(sizing.sam.valueUsd).toBeUndefined();
    expect(sizing.som.valueUsd).toBeUndefined();
  });

  it("includes the industry in each estimate's methodology note", () => {
    const sizing = buildMarketSizing({ industry: "fintech" });

    expect(sizing.tam.methodology).toContain("fintech");
    expect(sizing.sam.methodology).toContain("fintech");
    expect(sizing.som.methodology).toContain("fintech");
  });

  it("produces distinct methodology notes for tam, sam, and som", () => {
    const sizing = buildMarketSizing({ industry: "fintech" });

    const methodologies = new Set([sizing.tam.methodology, sizing.sam.methodology, sizing.som.methodology]);
    expect(methodologies.size).toBe(3);
  });
});
