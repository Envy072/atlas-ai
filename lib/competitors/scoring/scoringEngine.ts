import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompetitorScore, DimensionScore } from "@/lib/competitors/schemas/scoring.schema";
import { CompetitorScoreSchema } from "@/lib/competitors/schemas/scoring.schema";
import type { ScoringDimension } from "@/lib/competitors/schemas/enums";
import {
  scoreBrandStrength,
  scoreFunding,
  scoreGrowth,
  scoreInnovation,
  scoreMarketPresence,
  scorePricing,
  scoreProductBreadth,
  scoreTechnicalComplexity,
} from "@/lib/competitors/scoring/scoringDimensions";
import { parseOrThrow } from "@/lib/validation/parse";

// Equal weighting across all eight dimensions — a real, adjustable
// decision (like Research Milestone 5's FACTOR_WEIGHTS), independent of
// whether the dimension functions themselves are placeholders yet. Sums to
// 1 so overallScore stays on the same 0-100 scale as each dimension.
const DIMENSION_WEIGHTS: Record<ScoringDimension, number> = {
  innovation: 0.125,
  market_presence: 0.125,
  pricing: 0.125,
  product_breadth: 0.125,
  growth: 0.125,
  funding: 0.125,
  technical_complexity: 0.125,
  brand_strength: 0.125,
};

const DIMENSION_SCORERS: Record<ScoringDimension, (profile: CompanyProfile) => number> = {
  innovation: scoreInnovation,
  market_presence: scoreMarketPresence,
  pricing: scorePricing,
  product_breadth: scoreProductBreadth,
  growth: scoreGrowth,
  funding: scoreFunding,
  technical_complexity: scoreTechnicalComplexity,
  brand_strength: scoreBrandStrength,
};

const ALL_DIMENSIONS = Object.keys(DIMENSION_SCORERS) as ScoringDimension[];

// Scores one company across every dimension and composes a single overall
// score — fully functional composition logic today (like Research
// Milestone 4's rankSources()), even though every individual dimension
// score currently comes from a neutral placeholder (see
// scoringDimensions.ts). Once a real scorer replaces a placeholder, this
// function needs no changes.
export function scoreCompany(profile: CompanyProfile, now: Date = new Date()): CompetitorScore {
  const dimensions: DimensionScore[] = ALL_DIMENSIONS.map((dimension) => ({
    dimension,
    score: DIMENSION_SCORERS[dimension](profile),
  }));

  const overallScore = Math.round(
    dimensions.reduce((sum, entry) => sum + entry.score * DIMENSION_WEIGHTS[entry.dimension], 0)
  );

  return parseOrThrow(
    CompetitorScoreSchema,
    {
      companyId: profile.id,
      dimensions,
      overallScore,
      scoredAt: now.toISOString(),
    },
    "Failed to build a schema-valid CompetitorScore."
  );
}
