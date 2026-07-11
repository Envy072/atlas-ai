import type { BusinessProfile } from "@/lib/business/schemas/business.schema";

// ARCHITECTURE ONLY — NO INVENTED SCORES. Every function below returns a
// fixed, neutral placeholder (50/100), not a real score, exactly like the
// other three platforms' scoring/scoringDimensions.ts. Honest rather than
// fake, because a freshly synthesized BusinessProfile (see
// knowledge/businessProfileBuilder.ts) starts with almost every
// strategic/execution/SWOT field honestly unknown — there is no real
// signal yet for any of these six dimensions to compute from.
//
// Each function's signature is the permanent contract; a future
// implementation replaces only the body:
//   - scoreBusinessQuality: composite of value proposition clarity +
//     customer-problem specificity, once real
//   - scoreExecutionReadiness: inverse function of executionComplexity +
//     keyDependencies' criticality, once real
//   - scoreGrowthPotential: composite of growthDrivers + Financial
//     Platform's own growth economics, once real
//   - scoreCompetitiveStrength: composite of competitivePosition +
//     economicMoat.strengthScore, once real
//   - scoreOperationalHealth: inverse function of operationalRisks'
//     severities, once real
//   - scoreStrategicPosition: composite of goToMarketStrategy clarity +
//     competitiveAdvantages count, once real

const PLACEHOLDER_SCORE = 50;

export function scoreBusinessQuality(profile: BusinessProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreExecutionReadiness(profile: BusinessProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreGrowthPotential(profile: BusinessProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreCompetitiveStrength(profile: BusinessProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreOperationalHealth(profile: BusinessProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreStrategicPosition(profile: BusinessProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}
