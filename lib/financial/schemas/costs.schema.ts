import { z } from "zod";

export const ExpenseCategorySchema = z.enum([
  "payroll",
  "infrastructure",
  "marketing",
  "sales",
  "operations",
  "other",
]);

export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

// One named expense — a plain optional number for the same reason
// RevenueStream's estimatedMonthlyUsd is: a list item's own size, not an
// aggregate metric needing methodology/confidence.
export const ExpenseSchema = z.object({
  name: z.string().min(1),
  category: ExpenseCategorySchema.optional(),
  estimatedMonthlyUsd: z.number().nonnegative().optional(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

// The profile-level cost breakdown — optional as a whole (a profile with
// no cost data yet simply omits it), plain optional numbers for the same
// reason as above.
export const CostStructureSchema = z.object({
  fixedCostsUsdPerMonth: z.number().nonnegative().optional(),
  variableCostsUsdPerMonth: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type CostStructure = z.infer<typeof CostStructureSchema>;
