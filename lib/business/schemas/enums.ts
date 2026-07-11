import { z } from "zod";

// The classic leader/challenger/follower/nicher framing — optional (never
// defaulted) since assessing a real competitive position requires
// product-differentiation data this platform doesn't have yet.
export const CompetitivePositionSchema = z.enum(["leader", "challenger", "follower", "niche"]);

export type CompetitivePosition = z.infer<typeof CompetitivePositionSchema>;

// The common categories a defensible economic moat falls into. No "none"
// member — an absent EconomicMoat.type means "not yet assessed," which is
// a different (and more honest) claim than "assessed, and there is none."
export const MoatTypeSchema = z.enum([
  "network_effects",
  "brand",
  "switching_costs",
  "economies_of_scale",
  "proprietary_technology",
  "regulatory_advantage",
]);

export type MoatType = z.infer<typeof MoatTypeSchema>;

export const ExecutionComplexityLevelSchema = z.enum(["low", "medium", "high", "very_high"]);

export type ExecutionComplexityLevel = z.infer<typeof ExecutionComplexityLevelSchema>;

// A qualitative rating for BusinessProfile.overallHealth — optional, since
// this milestone's synthesis has no real basis to assign one yet (see
// profile/businessHealth.ts).
export const BusinessHealthRatingSchema = z.enum(["strong", "stable", "fragile", "critical"]);

export type BusinessHealthRating = z.infer<typeof BusinessHealthRatingSchema>;

// The eight recommendation categories this milestone specifies.
export const RecommendationCategorySchema = z.enum([
  "growth",
  "pricing",
  "marketing",
  "operations",
  "technology",
  "funding",
  "hiring",
  "product",
]);

export type RecommendationCategory = z.infer<typeof RecommendationCategorySchema>;

export const RecommendationPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export type RecommendationPriority = z.infer<typeof RecommendationPrioritySchema>;

// The six dimensions this milestone specifies for scoring/. Architecture
// only, no real scoring algorithm behind any of them yet (see
// scoring/scoringDimensions.ts).
export const BusinessScoringDimensionSchema = z.enum([
  "business_quality",
  "execution_readiness",
  "growth_potential",
  "competitive_strength",
  "operational_health",
  "strategic_position",
]);

export type BusinessScoringDimension = z.infer<typeof BusinessScoringDimensionSchema>;
