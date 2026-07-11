import type { FinancialRisk, FinancialRiskCategory } from "@/lib/financial/schemas/risk.schema";
import { FinancialRiskSchema } from "@/lib/financial/schemas/risk.schema";
import type { Severity } from "@/lib/market";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildFinancialRiskInput {
  category: FinancialRiskCategory;
  name: string;
  description?: string;
  severity?: Severity;
}

// The one place a FinancialRisk gets constructed — construction only, no
// automatic risk-detection pipeline exists yet. Supports all six required
// categories (liquidity, competition, execution, funding, market,
// regulatory) via the `category` input, not six separate builder
// functions — the category is data, not a different shape.
export function buildFinancialRisk(input: BuildFinancialRiskInput): FinancialRisk {
  return parseOrThrow(
    FinancialRiskSchema,
    {
      category: input.category,
      name: input.name,
      description: input.description,
      severity: input.severity,
    },
    "Failed to build a schema-valid FinancialRisk."
  );
}
