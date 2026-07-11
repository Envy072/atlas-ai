import { z } from "zod";

// One geographic market a MarketProfile spans. `region` is the required,
// human-meaningful label ("North America", "EMEA", "Southeast Asia");
// `country` narrows it further when the evidence is that specific.
export const GeographicMarketSchema = z.object({
  region: z.string().min(1),
  country: z.string().optional(),
  marketSizeUsd: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type GeographicMarket = z.infer<typeof GeographicMarketSchema>;
