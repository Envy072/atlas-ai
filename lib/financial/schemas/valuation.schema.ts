import { z } from "zod";
import { FinancialEstimateSchema } from "@/lib/financial/schemas/estimate.schema";

// The four valuation methods this milestone names as future work — fixed
// per the spec ("Examples: Revenue Multiple, EBITDA Multiple, DCF,
// Venture Method"), no implementation behind any of them yet.
export const ValuationMethodSchema = z.enum([
  "revenue_multiple",
  "ebitda_multiple",
  "dcf",
  "venture_method",
]);

export type ValuationMethod = z.infer<typeof ValuationMethodSchema>;

// One valuation method's (currently unimplemented) result — `estimate`'s
// `value` stays honestly absent; see valuation/valuationModels.ts.
export const ValuationEstimateSchema = z.object({
  method: ValuationMethodSchema,
  estimate: FinancialEstimateSchema,
});

export type ValuationEstimate = z.infer<typeof ValuationEstimateSchema>;
