import { z } from "zod";

// The unit a FinancialEstimate's `value` is denominated in — lets a
// generic estimate wrapper serve very differently-shaped metrics (a
// dollar amount, a percentage, a span of months, a dimensionless ratio)
// without a separate schema per metric.
export const FinancialUnitSchema = z.enum([
  "usd",
  "usd_per_month",
  "percent",
  "months",
  "ratio",
]);

export type FinancialUnit = z.infer<typeof FinancialUnitSchema>;

// The one honest-estimate shape every numeric FinancialProfile field
// (grossMargin, burnRate, cac, ltv, mrr, ...) uses — mirrors
// lib/market's MarketSizeEstimateSchema exactly, generalized beyond
// market sizing to any financial metric. `value` is optional so "we
// don't know this yet" is representable without a sentinel like 0 or -1;
// `methodology` documents how a real estimate would be (or was) derived,
// independent of whether `value` itself is present.
export const FinancialEstimateSchema = z.object({
  value: z.number().optional(),
  unit: FinancialUnitSchema.optional(),
  methodology: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export type FinancialEstimate = z.infer<typeof FinancialEstimateSchema>;
