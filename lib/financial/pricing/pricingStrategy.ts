import type { FinancialPricingStrategy } from "@/lib/financial/schemas/pricing.schema";
import { FinancialPricingStrategySchema } from "@/lib/financial/schemas/pricing.schema";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildPricingStrategyInput {
  model?: string;
  rationale?: string;
  competitivePositioning?: string;
}

// The one place a FinancialPricingStrategy gets constructed — construction
// only, no automatic pricing-strategy inference exists yet (see
// FINANCIAL_PLATFORM.md's Future Roadmap).
export function buildPricingStrategy(input: BuildPricingStrategyInput): FinancialPricingStrategy {
  return parseOrThrow(
    FinancialPricingStrategySchema,
    {
      model: input.model,
      rationale: input.rationale,
      competitivePositioning: input.competitivePositioning,
    },
    "Failed to build a schema-valid FinancialPricingStrategy."
  );
}
