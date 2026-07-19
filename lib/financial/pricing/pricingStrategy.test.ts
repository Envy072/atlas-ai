import { describe, it, expect } from "vitest";
import { buildPricingStrategy } from "@/lib/financial/pricing/pricingStrategy";

// Milestone 60 — verifies this file's actual, current construction
// behavior: buildPricingStrategy is the one place a real
// FinancialPricingStrategy gets constructed and schema-validated; every
// field is independently optional.
describe("buildPricingStrategy", () => {
  it("threads through every provided field", () => {
    const strategy = buildPricingStrategy({
      model: "usage-based with a free tier",
      rationale: "Lowers the barrier to first adoption for small teams.",
      competitivePositioning: "Priced below the category leader's entry tier.",
    });

    expect(strategy).toEqual({
      model: "usage-based with a free tier",
      rationale: "Lowers the barrier to first adoption for small teams.",
      competitivePositioning: "Priced below the category leader's entry tier.",
    });
  });

  it("leaves every field undefined when none are supplied", () => {
    const strategy = buildPricingStrategy({});

    expect(strategy.model).toBeUndefined();
    expect(strategy.rationale).toBeUndefined();
    expect(strategy.competitivePositioning).toBeUndefined();
  });

  it("threads through a partial input independently", () => {
    const strategy = buildPricingStrategy({ model: "subscription" });

    expect(strategy.model).toBe("subscription");
    expect(strategy.rationale).toBeUndefined();
    expect(strategy.competitivePositioning).toBeUndefined();
  });
});
