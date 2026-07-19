import { describe, it, expect } from "vitest";
import { buildRevenueStream } from "@/lib/financial/revenue/revenueStream";

// Milestone 60 — verifies this file's actual, current construction
// behavior: buildRevenueStream is the one place a real RevenueStream
// gets constructed and schema-validated; `name` is required, the rest
// optional.
describe("buildRevenueStream", () => {
  it("threads through every provided field", () => {
    const stream = buildRevenueStream({
      name: "Subscriptions",
      description: "Recurring monthly plan revenue.",
      revenueModel: "subscription",
      estimatedMonthlyUsd: 12000,
    });

    expect(stream).toEqual({
      name: "Subscriptions",
      description: "Recurring monthly plan revenue.",
      revenueModel: "subscription",
      estimatedMonthlyUsd: 12000,
    });
  });

  it("requires only `name`, leaving the rest undefined otherwise", () => {
    const stream = buildRevenueStream({ name: "Subscriptions" });

    expect(stream.name).toBe("Subscriptions");
    expect(stream.description).toBeUndefined();
    expect(stream.revenueModel).toBeUndefined();
    expect(stream.estimatedMonthlyUsd).toBeUndefined();
  });
});
