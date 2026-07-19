import { describe, it, expect } from "vitest";
import { buildFinancialRisk } from "@/lib/financial/risk/financialRisk";

// Milestone 60 — verifies this file's actual, current construction
// behavior: buildFinancialRisk is the one place a real FinancialRisk
// gets constructed and schema-validated; `category` and `name` are
// required, the rest optional.
describe("buildFinancialRisk", () => {
  it("threads through every provided field", () => {
    const risk = buildFinancialRisk({
      category: "liquidity",
      name: "Low cash reserves",
      description: "Fewer than three months of runway at current burn.",
      severity: "high",
    });

    expect(risk).toEqual({
      category: "liquidity",
      name: "Low cash reserves",
      description: "Fewer than three months of runway at current burn.",
      severity: "high",
    });
  });

  it("requires only `category` and `name`, leaving description and severity undefined otherwise", () => {
    const risk = buildFinancialRisk({ category: "funding", name: "No committed follow-on round" });

    expect(risk.category).toBe("funding");
    expect(risk.name).toBe("No committed follow-on round");
    expect(risk.description).toBeUndefined();
    expect(risk.severity).toBeUndefined();
  });

  it("supports each of the six documented risk categories", () => {
    const categories = ["liquidity", "competition", "execution", "funding", "market", "regulatory"] as const;

    for (const category of categories) {
      const risk = buildFinancialRisk({ category, name: "Sample risk" });
      expect(risk.category).toBe(category);
    }
  });
});
