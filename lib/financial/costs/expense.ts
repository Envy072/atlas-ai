import type { Expense, ExpenseCategory } from "@/lib/financial/schemas/costs.schema";
import { ExpenseSchema } from "@/lib/financial/schemas/costs.schema";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildExpenseInput {
  name: string;
  category?: ExpenseCategory;
  estimatedMonthlyUsd?: number;
}

// The one place an Expense gets constructed — construction only.
export function buildExpense(input: BuildExpenseInput): Expense {
  return parseOrThrow(
    ExpenseSchema,
    {
      name: input.name,
      category: input.category,
      estimatedMonthlyUsd: input.estimatedMonthlyUsd,
    },
    "Failed to build a schema-valid Expense."
  );
}
