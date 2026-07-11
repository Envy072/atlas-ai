import { z } from "zod";

// The startup's own pricing strategy (distinct from lib/competitors'
// Pricing, which describes a competitor's published price list). `model`
// is a short free-text label ("usage-based with a free tier") rather than
// a fixed enum, for the same reason lib/competitors' Pricing.model is —
// the space of real pricing strategies is too varied to enumerate
// honestly without inventing categories nobody asked for.
export const FinancialPricingStrategySchema = z.object({
  model: z.string().optional(),
  rationale: z.string().optional(),
  competitivePositioning: z.string().optional(),
});

export type FinancialPricingStrategy = z.infer<typeof FinancialPricingStrategySchema>;
