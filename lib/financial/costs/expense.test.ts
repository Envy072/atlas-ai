import { describe, it, expect } from "vitest";
import { buildExpense } from "@/lib/financial/costs/expense";

// Milestone 60 — verifies this file's actual, current construction
// behavior: buildExpense is the one place a real Expense gets
// constructed and schema-validated; `name` is required, the rest
// optional.
describe("buildExpense", () => {
  it("threads through every provided field", () => {
    const expense = buildExpense({
      name: "AWS hosting",
      category: "infrastructure",
      estimatedMonthlyUsd: 800,
    });

    expect(expense).toEqual({
      name: "AWS hosting",
      category: "infrastructure",
      estimatedMonthlyUsd: 800,
    });
  });

  it("requires only `name`, leaving category and estimatedMonthlyUsd undefined otherwise", () => {
    const expense = buildExpense({ name: "AWS hosting" });

    expect(expense.name).toBe("AWS hosting");
    expect(expense.category).toBeUndefined();
    expect(expense.estimatedMonthlyUsd).toBeUndefined();
  });
});
