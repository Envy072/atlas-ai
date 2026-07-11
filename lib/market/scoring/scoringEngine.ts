import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketDimensionScore, MarketScore } from "@/lib/market/schemas/scoring.schema";
import { MarketScoreSchema } from "@/lib/market/schemas/scoring.schema";
import type { MarketScoringDimension } from "@/lib/market/schemas/enums";
import {
  scoreAccessibility,
  scoreCompetition,
  scoreGrowth,
  scoreMarketOpportunity,
  scoreMaturity,
  scoreRegulatoryComplexity,
} from "@/lib/market/scoring/scoringDimensions";
import { parseOrThrow } from "@/lib/validation/parse";

// Equal weighting across all six dimensions — a real, adjustable decision
// (like lib/competitors' DIMENSION_WEIGHTS), independent of whether the
// dimension functions themselves are placeholders yet.
const EQUAL_WEIGHT = 1 / 6;

const DIMENSION_WEIGHTS: Record<MarketScoringDimension, number> = {
  growth: EQUAL_WEIGHT,
  competition: EQUAL_WEIGHT,
  accessibility: EQUAL_WEIGHT,
  regulatory_complexity: EQUAL_WEIGHT,
  market_opportunity: EQUAL_WEIGHT,
  maturity: EQUAL_WEIGHT,
};

const DIMENSION_SCORERS: Record<MarketScoringDimension, (profile: MarketProfile) => number> = {
  growth: scoreGrowth,
  competition: scoreCompetition,
  accessibility: scoreAccessibility,
  regulatory_complexity: scoreRegulatoryComplexity,
  market_opportunity: scoreMarketOpportunity,
  maturity: scoreMaturity,
};

const ALL_DIMENSIONS = Object.keys(DIMENSION_SCORERS) as MarketScoringDimension[];

// Scores one market across every dimension and composes a single overall
// score — fully functional composition logic today (like
// lib/competitors' scoreCompany), even though every individual dimension
// score currently comes from a neutral placeholder (see
// scoringDimensions.ts). Once a placeholder gets a real implementation,
// this function needs no changes.
export function scoreMarket(profile: MarketProfile, now: Date = new Date()): MarketScore {
  const dimensions: MarketDimensionScore[] = ALL_DIMENSIONS.map((dimension) => ({
    dimension,
    score: DIMENSION_SCORERS[dimension](profile),
  }));

  const overallScore = Math.round(
    dimensions.reduce((sum, entry) => sum + entry.score * DIMENSION_WEIGHTS[entry.dimension], 0)
  );

  return parseOrThrow(
    MarketScoreSchema,
    {
      marketId: profile.id,
      dimensions,
      overallScore,
      scoredAt: now.toISOString(),
    },
    "Failed to build a schema-valid MarketScore."
  );
}
