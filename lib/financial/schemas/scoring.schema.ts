import { z } from "zod";

// The six dimensions this milestone specifies. Architecture only, no real
// scoring algorithm behind any of them yet (see scoring/scoringDimensions.ts).
export const FinancialScoringDimensionSchema = z.enum([
  "financial_health",
  "capital_efficiency",
  "growth_potential",
  "revenue_quality",
  "risk_level",
  "profitability",
]);

export type FinancialScoringDimension = z.infer<typeof FinancialScoringDimensionSchema>;

export const FinancialDimensionScoreSchema = z.object({
  dimension: FinancialScoringDimensionSchema,
  score: z.number().min(0).max(100),
  rationale: z.string().optional(),
});

export type FinancialDimensionScore = z.infer<typeof FinancialDimensionScoreSchema>;

// A startup's full financial scorecard — one FinancialDimensionScore per
// FinancialScoringDimension, plus a single composed overall score.
export const FinancialScoreSchema = z.object({
  financialProfileId: z.string(),
  dimensions: z.array(FinancialDimensionScoreSchema),
  overallScore: z.number().min(0).max(100),
  scoredAt: z.string(),
});

export type FinancialScore = z.infer<typeof FinancialScoreSchema>;
