import type { GeographicMarket } from "@/lib/market/schemas/geography.schema";
import { GeographicMarketSchema } from "@/lib/market/schemas/geography.schema";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildGeographicMarketInput {
  region: string;
  country?: string;
  marketSizeUsd?: number;
  notes?: string;
}

// The one place a GeographicMarket gets constructed — construction only,
// same discipline as segmentation/customerSegmentation.ts.
export function buildGeographicMarket(input: BuildGeographicMarketInput): GeographicMarket {
  return parseOrThrow(
    GeographicMarketSchema,
    {
      region: input.region,
      country: input.country,
      marketSizeUsd: input.marketSizeUsd,
      notes: input.notes,
    },
    "Failed to build a schema-valid GeographicMarket."
  );
}
