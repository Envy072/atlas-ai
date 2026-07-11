import { z } from "zod";

// A market's lifecycle stage. Deliberately not given an "unknown" member —
// this project represents "we don't know yet" via optionality (see
// MarketProfileSchema.marketMaturity being `.optional()`), the same choice
// lib/competitors made for CompetitorCategory, rather than smuggling
// "unknown" in as a fake enum value.
export const MarketMaturitySchema = z.enum(["emerging", "growth", "mature", "declining"]);

export type MarketMaturity = z.infer<typeof MarketMaturitySchema>;

// The six dimensions the scoring engine (scoring/) produces a score for —
// fixed per this milestone's instructions ("Growth, Competition,
// Accessibility, Regulatory Complexity, Market Opportunity, Maturity").
// Architecture only, no real scoring algorithm behind any of them yet (see
// scoring/scoringDimensions.ts).
export const MarketScoringDimensionSchema = z.enum([
  "growth",
  "competition",
  "accessibility",
  "regulatory_complexity",
  "market_opportunity",
  "maturity",
]);

export type MarketScoringDimension = z.infer<typeof MarketScoringDimensionSchema>;

// How severe a single regulation's compliance burden or a single risk's
// potential impact is. Shared between regulation.schema.ts and
// risks.schema.ts since both describe the same kind of judgment.
export const SeveritySchema = z.enum(["low", "medium", "high"]);

export type Severity = z.infer<typeof SeveritySchema>;

// Which way a market trend is currently moving.
export const TrendDirectionSchema = z.enum(["rising", "stable", "declining"]);

export type TrendDirection = z.infer<typeof TrendDirectionSchema>;
