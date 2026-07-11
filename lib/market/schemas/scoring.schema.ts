import { z } from "zod";
import { MarketScoringDimensionSchema } from "@/lib/market/schemas/enums";

export const MarketDimensionScoreSchema = z.object({
  dimension: MarketScoringDimensionSchema,
  score: z.number().min(0).max(100),
  rationale: z.string().optional(),
});

export type MarketDimensionScore = z.infer<typeof MarketDimensionScoreSchema>;

// A market's full scorecard — one MarketDimensionScore per
// MarketScoringDimension, plus a single composed overall score.
// Architecture only today (see scoring/scoringDimensions.ts): every
// dimension function returns a fixed neutral placeholder, exactly like
// lib/competitors' CompetitorScore.
export const MarketScoreSchema = z.object({
  marketId: z.string(),
  dimensions: z.array(MarketDimensionScoreSchema),
  overallScore: z.number().min(0).max(100),
  scoredAt: z.string(),
});

export type MarketScore = z.infer<typeof MarketScoreSchema>;
