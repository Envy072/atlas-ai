import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

// ARCHITECTURE ONLY — every function below returns a fixed, neutral
// placeholder (50/100), not a real score, exactly like Research Milestone
// 4's lib/research/ranking/factors.ts. Honest rather than fake, because a
// freshly-discovered CompanyProfile (see knowledge/companyProfileBuilder.ts)
// starts with empty features/technology/funding — there is no real signal
// yet for any of these eight dimensions to compute from, so a fabricated
// score would be indistinguishable from a genuine 50 either way.
//
// Each function's signature is the permanent contract; a future
// implementation replaces only the body:
//   - scoreInnovation: patent/feature-velocity signals, or LLM-assessed
//     novelty of the profile's description/features
//   - scoreMarketPresence: web-traffic / social-following signals
//   - scorePricing: percentile rank of profile.pricing.startingPriceUsd
//     against other known companies in the same category
//   - scoreProductBreadth: profile.features.length, weighted by category
//   - scoreGrowth: funding velocity, hiring signals, review-volume trend
//   - scoreFunding: percentile rank of profile.funding.totalRaisedUsd
//   - scoreTechnicalComplexity: profile.technology depth/breadth heuristics
//   - scoreBrandStrength: backlink/search-volume/press-mention signals

const PLACEHOLDER_SCORE = 50;

export function scoreInnovation(profile: CompanyProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreMarketPresence(profile: CompanyProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scorePricing(profile: CompanyProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreProductBreadth(profile: CompanyProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreGrowth(profile: CompanyProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreFunding(profile: CompanyProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreTechnicalComplexity(profile: CompanyProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}

export function scoreBrandStrength(profile: CompanyProfile): number {
  void profile;
  return PLACEHOLDER_SCORE;
}
