import { z } from "zod";

// How a company relates to the startup idea it was discovered against.
// "adjacent" = solves a neighboring problem for the same buyer;
// "aspirational" = not a competitor today but a plausible one if either
// company expands (the kind of comparison an investor asks for anyway).
export const CompetitorCategorySchema = z.enum([
  "direct",
  "indirect",
  "adjacent",
  "aspirational",
]);

export type CompetitorCategory = z.infer<typeof CompetitorCategorySchema>;

// Why a company's knowledge is being refreshed. "initial_discovery" is the
// first write a company ever gets; every later refresh carries one of the
// other three so the history of *why* data changed is never lost.
export const RefreshReasonSchema = z.enum([
  "initial_discovery",
  "manual",
  "scheduled",
  "stale",
]);

export type RefreshReason = z.infer<typeof RefreshReasonSchema>;

// How urgently a stale/flagged company should be re-researched. Ordering
// matters — the refresh engine sorts a stale queue by this.
export const RefreshPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export type RefreshPriority = z.infer<typeof RefreshPrioritySchema>;

// One row of the reusable comparison object (comparison/comparisonEngine.ts).
// A fixed dimension set, not a free-text label, so a future UI can render a
// known set of comparison columns instead of an arbitrary string.
export const ComparisonDimensionSchema = z.enum([
  "features",
  "pricing",
  "business_model",
  "target_market",
  "strengths",
  "weaknesses",
  "technology",
  "market_position",
]);

export type ComparisonDimension = z.infer<typeof ComparisonDimensionSchema>;

// The eight dimensions the scoring engine (scoring/) produces a score for.
// Fixed per this milestone's instructions ("Dimensions: Innovation, Market
// Presence, Pricing, Product Breadth, Growth, Funding, Technical
// Complexity, Brand Strength") — architecture only, no real scoring
// algorithm behind any of them yet (see scoring/scoringDimensions.ts).
export const ScoringDimensionSchema = z.enum([
  "innovation",
  "market_presence",
  "pricing",
  "product_breadth",
  "growth",
  "funding",
  "technical_complexity",
  "brand_strength",
]);

export type ScoringDimension = z.infer<typeof ScoringDimensionSchema>;

// A billing period for one pricing tier. "custom" covers enterprise/
// contact-sales tiers that don't publish a fixed price.
export const BillingPeriodSchema = z.enum([
  "monthly",
  "annual",
  "one_time",
  "usage_based",
  "custom",
]);

export type BillingPeriod = z.infer<typeof BillingPeriodSchema>;
