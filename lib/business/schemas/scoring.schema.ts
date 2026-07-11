import { z } from "zod";
import { BusinessScoringDimensionSchema } from "@/lib/business/schemas/enums";

export const BusinessDimensionScoreSchema = z.object({
  dimension: BusinessScoringDimensionSchema,
  score: z.number().min(0).max(100),
  rationale: z.string().optional(),
});

export type BusinessDimensionScore = z.infer<typeof BusinessDimensionScoreSchema>;

// A startup's full business scorecard — one BusinessDimensionScore per
// BusinessScoringDimension, plus a single composed overall score.
// Architecture only today (see scoring/scoringDimensions.ts).
export const BusinessScoreSchema = z.object({
  businessProfileId: z.string(),
  dimensions: z.array(BusinessDimensionScoreSchema),
  overallScore: z.number().min(0).max(100),
  scoredAt: z.string(),
});

export type BusinessScore = z.infer<typeof BusinessScoreSchema>;
