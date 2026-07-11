import type { MarketRisk } from "@/lib/market/schemas/risks.schema";
import { MarketRiskSchema } from "@/lib/market/schemas/risks.schema";
import type { Severity } from "@/lib/market/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildMarketRiskInput {
  name: string;
  description?: string;
  severity?: Severity;
}

// The one place a MarketRisk gets constructed — construction only, no
// automatic risk-detection pipeline exists yet.
export function buildMarketRisk(input: BuildMarketRiskInput): MarketRisk {
  return parseOrThrow(
    MarketRiskSchema,
    {
      name: input.name,
      description: input.description,
      severity: input.severity,
    },
    "Failed to build a schema-valid MarketRisk."
  );
}
