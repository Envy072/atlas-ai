import { describe, it, expect } from "vitest";
import { buildCostStructure } from "@/lib/financial/costs/costStructure";

// Milestone 60 — verifies this file's actual, current construction
// behavior: buildCostStructure is the one place a real CostStructure
// gets constructed and schema-validated; every field is independently
// optional.
describe("buildCostStructure", () => {
  it("threads through every provided field", () => {
    const costs = buildCostStructure({
      fixedCostsUsdPerMonth: 5000,
      variableCostsUsdPerMonth: 1500,
      notes: "Fixed costs include office lease and core headcount.",
    });

    expect(costs).toEqual({
      fixedCostsUsdPerMonth: 5000,
      variableCostsUsdPerMonth: 1500,
      notes: "Fixed costs include office lease and core headcount.",
    });
  });

  it("leaves every field undefined when none are supplied", () => {
    const costs = buildCostStructure({});

    expect(costs.fixedCostsUsdPerMonth).toBeUndefined();
    expect(costs.variableCostsUsdPerMonth).toBeUndefined();
    expect(costs.notes).toBeUndefined();
  });
});
