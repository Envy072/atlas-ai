import { z } from "zod";

// Optional at the profile level (never defaulted) — a startup whose
// funding stage isn't yet known simply omits this field, the same
// "unknown via optionality" choice lib/market made for MarketMaturity.
export const FundingStageSchema = z.enum([
  "pre_seed",
  "seed",
  "series_a",
  "series_b",
  "series_c_plus",
  "growth",
  "public",
]);

export type FundingStage = z.infer<typeof FundingStageSchema>;
