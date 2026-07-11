import { z } from "zod";

// One market-size estimate (used for TAM, SAM, and SOM alike). Every field
// is optional so "we don't know this yet" is representable without a
// sentinel value like 0 or -1 — a $0 TAM and an unknown TAM must never
// look the same. `methodology` documents *how* a real estimate would be
// (or was) derived, independent of whether `valueUsd` itself is present
// yet — see sizing/marketSizing.ts, which today always returns a
// methodology note with no value (architecture only, no fake calculations).
export const MarketSizeEstimateSchema = z.object({
  valueUsd: z.number().nonnegative().optional(),
  asOfYear: z.number().int().optional(),
  methodology: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export type MarketSizeEstimate = z.infer<typeof MarketSizeEstimateSchema>;

// TAM/SAM/SOM together — always present as an object on a MarketProfile
// (never the field itself omitted), but every estimate inside may be
// entirely empty (`{}`) when genuinely unknown.
export const MarketSizingSchema = z.object({
  tam: MarketSizeEstimateSchema,
  sam: MarketSizeEstimateSchema,
  som: MarketSizeEstimateSchema,
});

export type MarketSizing = z.infer<typeof MarketSizingSchema>;

// A market's growth rate — optional as a whole (a market with no reliable
// CAGR data simply omits this field, rather than fabricating a number).
export const MarketGrowthRateSchema = z.object({
  cagrPercent: z.number().optional(),
  periodYears: z.number().int().positive().optional(),
  methodology: z.string().optional(),
});

export type MarketGrowthRate = z.infer<typeof MarketGrowthRateSchema>;
