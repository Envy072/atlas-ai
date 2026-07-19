import { describe, it, expect } from "vitest";
import { buildEconomicMoat } from "@/lib/business/moat/economicMoat";

// Milestone 57 — verifies this file's actual, current construction
// behavior: buildEconomicMoat is the one place a real EconomicMoat gets
// constructed and schema-validated; every field is independently optional.
describe("buildEconomicMoat", () => {
  it("threads through every provided field", () => {
    const moat = buildEconomicMoat({
      type: "network_effects",
      strengthScore: 70,
      rationale: "Strong network effects among two-sided marketplace users.",
    });

    expect(moat).toEqual({
      type: "network_effects",
      strengthScore: 70,
      rationale: "Strong network effects among two-sided marketplace users.",
    });
  });

  it("leaves every field undefined when none are supplied", () => {
    const moat = buildEconomicMoat({});

    expect(moat.type).toBeUndefined();
    expect(moat.strengthScore).toBeUndefined();
    expect(moat.rationale).toBeUndefined();
  });

  it("threads through a partial input independently", () => {
    const moat = buildEconomicMoat({ type: "brand" });

    expect(moat.type).toBe("brand");
    expect(moat.strengthScore).toBeUndefined();
    expect(moat.rationale).toBeUndefined();
  });
});
