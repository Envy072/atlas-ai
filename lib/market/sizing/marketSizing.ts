import type { MarketSizeEstimate, MarketSizing } from "@/lib/market/schemas/sizing.schema";

// ARCHITECTURE ONLY. NO FAKE CALCULATIONS. Every function below returns an
// estimate with `valueUsd` deliberately absent — there is no real
// market-sizing data pipeline yet (no financial-data provider, no industry
// report ingestion), so computing an actual number here would mean
// inventing one. This is the same discipline lib/competitors' scoring
// layer and lib/research's ranking layer apply to their own placeholders:
// honest architecture over a fabricated result.
//
// Each function's signature is the permanent contract; a future
// implementation replaces only the body:
//   - estimateTAM: top-down, from an industry-report total addressable
//     figure for the classified industry
//   - estimateSAM: TAM narrowed by the profile's actual customer segments
//     and geographic markets
//   - estimateSOM: SAM narrowed by a realistic capture-rate model for a
//     new entrant

export interface MarketSizingContext {
  industry: string;
}

function buildUnknownEstimate(methodology: string): MarketSizeEstimate {
  return { methodology };
}

export function estimateTAM(context: MarketSizingContext): MarketSizeEstimate {
  return buildUnknownEstimate(
    `Top-down industry-report estimate for "${context.industry}" — not yet computed.`
  );
}

export function estimateSAM(context: MarketSizingContext): MarketSizeEstimate {
  return buildUnknownEstimate(
    `TAM narrowed by customer segments/geography for "${context.industry}" — not yet computed.`
  );
}

export function estimateSOM(context: MarketSizingContext): MarketSizeEstimate {
  return buildUnknownEstimate(
    `SAM narrowed by a capture-rate model for "${context.industry}" — not yet computed.`
  );
}

// The one place a MarketProfile's sizing block gets constructed, so every
// caller gets the same honest, methodology-documented shape rather than a
// hand-assembled one.
export function buildMarketSizing(context: MarketSizingContext): MarketSizing {
  return {
    tam: estimateTAM(context),
    sam: estimateSAM(context),
    som: estimateSOM(context),
  };
}
