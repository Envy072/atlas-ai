import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import type { BusinessDimensionScore, BusinessScore } from "@/lib/business/schemas/scoring.schema";
import { BusinessScoreSchema } from "@/lib/business/schemas/scoring.schema";
import type { BusinessScoringDimension } from "@/lib/business/schemas/enums";
import {
  scoreBusinessQuality,
  scoreCompetitiveStrength,
  scoreExecutionReadiness,
  scoreGrowthPotential,
  scoreOperationalHealth,
  scoreStrategicPosition,
} from "@/lib/business/scoring/scoringDimensions";
import { parseOrThrow } from "@/lib/validation/parse";

// Equal weighting across all six dimensions — a real, adjustable decision
// (like the other three platforms' own DIMENSION_WEIGHTS), independent of
// whether the dimension functions themselves are placeholders yet.
const EQUAL_WEIGHT = 1 / 6;

const DIMENSION_WEIGHTS: Record<BusinessScoringDimension, number> = {
  business_quality: EQUAL_WEIGHT,
  execution_readiness: EQUAL_WEIGHT,
  growth_potential: EQUAL_WEIGHT,
  competitive_strength: EQUAL_WEIGHT,
  operational_health: EQUAL_WEIGHT,
  strategic_position: EQUAL_WEIGHT,
};

const DIMENSION_SCORERS: Record<BusinessScoringDimension, (profile: BusinessProfile) => number> = {
  business_quality: scoreBusinessQuality,
  execution_readiness: scoreExecutionReadiness,
  growth_potential: scoreGrowthPotential,
  competitive_strength: scoreCompetitiveStrength,
  operational_health: scoreOperationalHealth,
  strategic_position: scoreStrategicPosition,
};

const ALL_DIMENSIONS = Object.keys(DIMENSION_SCORERS) as BusinessScoringDimension[];

// Scores one business profile across every dimension and composes a
// single overall score — fully functional composition logic today (like
// the other three platforms' own scoring engines), even though every
// individual dimension score currently comes from a neutral placeholder
// (see scoringDimensions.ts).
export function scoreBusiness(profile: BusinessProfile, now: Date = new Date()): BusinessScore {
  const dimensions: BusinessDimensionScore[] = ALL_DIMENSIONS.map((dimension) => ({
    dimension,
    score: DIMENSION_SCORERS[dimension](profile),
  }));

  const overallScore = Math.round(
    dimensions.reduce((sum, entry) => sum + entry.score * DIMENSION_WEIGHTS[entry.dimension], 0)
  );

  return parseOrThrow(
    BusinessScoreSchema,
    {
      businessProfileId: profile.id,
      dimensions,
      overallScore,
      scoredAt: now.toISOString(),
    },
    "Failed to build a schema-valid BusinessScore."
  );
}
