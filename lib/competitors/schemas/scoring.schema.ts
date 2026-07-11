import { z } from "zod";
import { ScoringDimensionSchema } from "@/lib/competitors/schemas/enums";

export const DimensionScoreSchema = z.object({
  dimension: ScoringDimensionSchema,
  score: z.number().min(0).max(100),
  rationale: z.string().optional(),
});

export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

// A company's full scorecard — one DimensionScore per ScoringDimension,
// plus a single composed overall score. Architecture only today (see
// scoring/scoringDimensions.ts): every dimension function returns a fixed
// neutral placeholder, so `overallScore` is real composition logic over
// not-yet-real inputs, exactly like Research Milestone 4's ranking layer.
export const CompetitorScoreSchema = z.object({
  companyId: z.string(),
  dimensions: z.array(DimensionScoreSchema),
  overallScore: z.number().min(0).max(100),
  scoredAt: z.string(),
});

export type CompetitorScore = z.infer<typeof CompetitorScoreSchema>;
