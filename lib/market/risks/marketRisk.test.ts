import { describe, it, expect } from "vitest";
import { buildMarketRisk } from "@/lib/market/risks/marketRisk";

// Milestone 73 — verifies this file's actual, current construction
// behavior: buildMarketRisk is the one place a real MarketRisk gets
// constructed and schema-validated; `name` is required, the rest
// optional.
describe("buildMarketRisk", () => {
  it("threads through every provided field", () => {
    const risk = buildMarketRisk({
      name: "Market saturation",
      description: "Several well-funded competitors already serve this segment.",
      severity: "medium",
    });

    expect(risk).toEqual({
      name: "Market saturation",
      description: "Several well-funded competitors already serve this segment.",
      severity: "medium",
    });
  });

  it("requires only `name`, leaving description and severity undefined otherwise", () => {
    const risk = buildMarketRisk({ name: "Market saturation" });

    expect(risk.name).toBe("Market saturation");
    expect(risk.description).toBeUndefined();
    expect(risk.severity).toBeUndefined();
  });
});
