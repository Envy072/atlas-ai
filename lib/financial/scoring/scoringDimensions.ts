import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";

// ARCHITECTURE ONLY — NO INVENTED SCORES. Every function below returns a
// fixed, neutral placeholder (50/100), not a real score, exactly like
// lib/competitors' and lib/market's scoring/scoringDimensions.ts. Honest
// rather than fake, because a freshly discovered FinancialProfile (see
// knowledge/financialProfileBuilder.ts) starts with every FinancialEstimate
// field honestly unknown — there is no real signal yet for any of these
// six dimensions to compute from.
//
// Each function's signature is the permanent contract; a future
// implementation replaces only the body:
//   - scoreFinancialHealth: composite of runway + burn rate, once real
//   - scoreCapitalEfficiency: ltvToCac + paybackPeriod, once real
//   - scoreGrowthPotential: MRR/ARR trajectory, once forecast/ is real
//   - scoreRevenueQuality: revenue-stream diversity + revenueModel
//     durability (subscription > one-time, e.g.)
//   - scoreRiskLevel: inverse function of financialRisks' severities
//   - scoreProfitability: grossMargin + operatingMargin, once real

const PLACEHOLDER_SCORE = 50;

export function scoreFinancialHealth(profile: FinancialProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreCapitalEfficiency(profile: FinancialProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreGrowthPotential(profile: FinancialProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreRevenueQuality(profile: FinancialProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreRiskLevel(profile: FinancialProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreProfitability(profile: FinancialProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}
