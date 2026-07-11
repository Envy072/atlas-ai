import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import type { FinancialDimensionScore, FinancialScore } from "@/lib/financial/schemas/scoring.schema";
import { FinancialScoreSchema } from "@/lib/financial/schemas/scoring.schema";
import type { FinancialScoringDimension } from "@/lib/financial/schemas/scoring.schema";
import {
  scoreCapitalEfficiency,
  scoreFinancialHealth,
  scoreGrowthPotential,
  scoreProfitability,
  scoreRevenueQuality,
  scoreRiskLevel,
} from "@/lib/financial/scoring/scoringDimensions";
import { parseOrThrow } from "@/lib/validation/parse";

// Equal weighting across all six dimensions — a real, adjustable decision
// (like lib/competitors' and lib/market's own DIMENSION_WEIGHTS),
// independent of whether the dimension functions themselves are
// placeholders yet.
const EQUAL_WEIGHT = 1 / 6;

const DIMENSION_WEIGHTS: Record<FinancialScoringDimension, number> = {
  financial_health: EQUAL_WEIGHT,
  capital_efficiency: EQUAL_WEIGHT,
  growth_potential: EQUAL_WEIGHT,
  revenue_quality: EQUAL_WEIGHT,
  risk_level: EQUAL_WEIGHT,
  profitability: EQUAL_WEIGHT,
};

const DIMENSION_SCORERS: Record<FinancialScoringDimension, (profile: FinancialProfile) => number> = {
  financial_health: scoreFinancialHealth,
  capital_efficiency: scoreCapitalEfficiency,
  growth_potential: scoreGrowthPotential,
  revenue_quality: scoreRevenueQuality,
  risk_level: scoreRiskLevel,
  profitability: scoreProfitability,
};

const ALL_DIMENSIONS = Object.keys(DIMENSION_SCORERS) as FinancialScoringDimension[];

// Scores one financial profile across every dimension and composes a
// single overall score — fully functional composition logic today (like
// lib/competitors' scoreCompany and lib/market's scoreMarket), even though
// every individual dimension score currently comes from a neutral
// placeholder (see scoringDimensions.ts).
export function scoreFinancials(profile: FinancialProfile, now: Date = new Date()): FinancialScore {
  const dimensions: FinancialDimensionScore[] = ALL_DIMENSIONS.map((dimension) => ({
    dimension,
    score: DIMENSION_SCORERS[dimension](profile),
  }));

  const overallScore = Math.round(
    dimensions.reduce((sum, entry) => sum + entry.score * DIMENSION_WEIGHTS[entry.dimension], 0)
  );

  return parseOrThrow(
    FinancialScoreSchema,
    {
      financialProfileId: profile.id,
      dimensions,
      overallScore,
      scoredAt: now.toISOString(),
    },
    "Failed to build a schema-valid FinancialScore."
  );
}
