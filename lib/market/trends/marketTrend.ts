import type { MarketTrend } from "@/lib/market/schemas/trends.schema";
import { MarketTrendSchema } from "@/lib/market/schemas/trends.schema";
import type { TrendDirection } from "@/lib/market/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildMarketTrendInput {
  name: string;
  description?: string;
  direction: TrendDirection;
}

// The one place a MarketTrend gets constructed. `direction` is required on
// the input, not defaulted — a caller must supply a real, evidenced
// direction, never a guessed "stable".
export function buildMarketTrend(input: BuildMarketTrendInput): MarketTrend {
  return parseOrThrow(
    MarketTrendSchema,
    {
      name: input.name,
      description: input.description,
      direction: input.direction,
    },
    "Failed to build a schema-valid MarketTrend."
  );
}
