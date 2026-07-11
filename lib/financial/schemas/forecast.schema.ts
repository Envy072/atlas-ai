import { z } from "zod";
import { FinancialEstimateSchema } from "@/lib/financial/schemas/estimate.schema";

export const ForecastScenarioSchema = z.enum(["base_case", "best_case", "worst_case"]);

export type ForecastScenario = z.infer<typeof ForecastScenarioSchema>;

// One scenario's projected trajectory. Every metric is a full
// FinancialEstimateSchema (always present as an object, honestly empty
// inside) rather than an optional bare number — a forecast is exactly the
// kind of place a fabricated-looking number would be most misleading, so
// the methodology/confidence fields travel with every projected value.
export const ForecastModelSchema = z.object({
  scenario: ForecastScenarioSchema,
  mrr: FinancialEstimateSchema,
  arr: FinancialEstimateSchema,
  burnRate: FinancialEstimateSchema,
  runway: FinancialEstimateSchema,
});

export type ForecastModel = z.infer<typeof ForecastModelSchema>;
