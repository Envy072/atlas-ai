import type { MarketProfile } from "@/lib/market/schemas/market.schema";

// ARCHITECTURE ONLY — NO INVENTED SCORES. Every function below returns a
// fixed, neutral placeholder (50/100), not a real score, exactly like
// lib/competitors' scoring/scoringDimensions.ts and lib/research's
// ranking/factors.ts. Honest rather than fake, because a freshly
// discovered MarketProfile (see knowledge/marketProfileBuilder.ts) starts
// with unknown sizing and empty segments/trends/regulations — there is no
// real signal yet for any of these six dimensions to compute from.
//
// Each function's signature is the permanent contract; a future
// implementation replaces only the body:
//   - scoreGrowth: profile.growthRate.cagrPercent, once populated
//   - scoreCompetition: inverse function of competitor count/density
//     (from lib/competitors, once correlated) for this market
//   - scoreAccessibility: barriers to entry inferred from
//     profile.regulations + profile.risks
//   - scoreRegulatoryComplexity: count/severity of profile.regulations
//   - scoreMarketOpportunity: composite of sizing (SOM/SAM ratio) and
//     growth once both are real
//   - scoreMaturity: derived from profile.marketMaturity once populated

const PLACEHOLDER_SCORE = 50;

export function scoreGrowth(profile: MarketProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreCompetition(profile: MarketProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreAccessibility(profile: MarketProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreRegulatoryComplexity(profile: MarketProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreMarketOpportunity(profile: MarketProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreMaturity(profile: MarketProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}
