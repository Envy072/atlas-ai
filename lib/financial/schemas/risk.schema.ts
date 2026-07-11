import { z } from "zod";
import { SeveritySchema } from "@/lib/market";

// The six risk categories this milestone specifies. Fixed enum, not
// free-text, so future scoring/reporting can group risks reliably.
export const FinancialRiskCategorySchema = z.enum([
  "liquidity",
  "competition",
  "execution",
  "funding",
  "market",
  "regulatory",
]);

export type FinancialRiskCategory = z.infer<typeof FinancialRiskCategorySchema>;

// One identified financial risk. `severity` reuses lib/market's own
// Severity schema (imported from "@/lib/market", its public barrel)
// rather than redefining the same low/medium/high enum a third time.
export const FinancialRiskSchema = z.object({
  category: FinancialRiskCategorySchema,
  name: z.string().min(1),
  description: z.string().optional(),
  severity: SeveritySchema.optional(),
});

export type FinancialRisk = z.infer<typeof FinancialRiskSchema>;
