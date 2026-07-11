import { z } from "zod";
import { TrendDirectionSchema } from "@/lib/market/schemas/enums";

// One observed market trend. `direction` is required (not defaulted to
// "stable") — a caller must supply a real, evidenced direction, never a
// guessed one; see trends/marketTrend.ts.
export const MarketTrendSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  direction: TrendDirectionSchema,
});

export type MarketTrend = z.infer<typeof MarketTrendSchema>;
