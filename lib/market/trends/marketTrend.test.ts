import { describe, it, expect } from "vitest";
import { buildMarketTrend } from "@/lib/market/trends/marketTrend";

// Milestone 70 — verifies this file's actual, current construction
// behavior: buildMarketTrend is the one place a real MarketTrend gets
// constructed and schema-validated. Unlike its sibling builders, both
// `name` and `direction` are required inputs — `direction` is
// deliberately never defaulted to a guessed "stable".
describe("buildMarketTrend", () => {
  it("threads through every provided field", () => {
    const trend = buildMarketTrend({
      name: "AI-assisted scheduling adoption",
      description: "Growing adoption of AI-assisted tools among SMB schedulers.",
      direction: "rising",
    });

    expect(trend).toEqual({
      name: "AI-assisted scheduling adoption",
      description: "Growing adoption of AI-assisted tools among SMB schedulers.",
      direction: "rising",
    });
  });

  it("requires both name and direction, leaving description undefined otherwise", () => {
    const trend = buildMarketTrend({ name: "AI-assisted scheduling adoption", direction: "rising" });

    expect(trend.name).toBe("AI-assisted scheduling adoption");
    expect(trend.direction).toBe("rising");
    expect(trend.description).toBeUndefined();
  });

  it("supports each of the three documented trend directions", () => {
    const directions = ["rising", "stable", "declining"] as const;

    for (const direction of directions) {
      const trend = buildMarketTrend({ name: "Sample trend", direction });
      expect(trend.direction).toBe(direction);
    }
  });
});
