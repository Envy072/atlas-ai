import type { EconomicMoat } from "@/lib/business/schemas/moat.schema";
import { EconomicMoatSchema } from "@/lib/business/schemas/moat.schema";
import type { MoatType } from "@/lib/business/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildEconomicMoatInput {
  type?: MoatType;
  strengthScore?: number;
  rationale?: string;
}

// The one place a real EconomicMoat gets constructed — construction only,
// for a future caller with real, evidenced input.
export function buildEconomicMoat(input: BuildEconomicMoatInput): EconomicMoat {
  return parseOrThrow(
    EconomicMoatSchema,
    {
      type: input.type,
      strengthScore: input.strengthScore,
      rationale: input.rationale,
    },
    "Failed to build a schema-valid EconomicMoat."
  );
}

// ARCHITECTURE ONLY. NEVER INVENT BUSINESS FACTS. Assessing a real moat
// requires product/market data this platform doesn't have yet — every
// field stays honestly absent until a future module supplies real input.
export function deriveEconomicMoat(): EconomicMoat {
  return {};
}
