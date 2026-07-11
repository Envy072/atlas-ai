import { z } from "zod";
import { SourceSchema, EvidenceSchema } from "@/lib/research";
import { RefreshMetadataSchema } from "@/lib/competitors";
import { FinancialEstimateSchema } from "@/lib/financial/schemas/estimate.schema";
import { RevenueModelSchema, RevenueStreamSchema } from "@/lib/financial/schemas/revenue.schema";
import { CostStructureSchema, ExpenseSchema } from "@/lib/financial/schemas/costs.schema";
import { FinancialPricingStrategySchema } from "@/lib/financial/schemas/pricing.schema";
import { FundingStageSchema } from "@/lib/financial/schemas/fundingStage.schema";
import { FinancialRiskSchema } from "@/lib/financial/schemas/risk.schema";

// The permanent knowledge-base record for one startup's financial
// picture — the single shape this whole platform exists to accumulate
// over time, exactly like lib/competitors' CompanyProfile and lib/market's
// MarketProfile. Every list/optional field starts empty/undefined because
// a freshly discovered financial profile legitimately knows almost
// nothing yet (see knowledge/financialProfileBuilder.ts); every numeric
// metric is a FinancialEstimateSchema (schemas/estimate.schema.ts) so
// "unknown" is representable without a fabricated sentinel value.
//
// `sources`/`evidence` reuse lib/research's own Source/Evidence schemas,
// and `refresh` reuses lib/competitors' own RefreshMetadata schema — both
// imported from their respective public barrels, never redefined here,
// per this project's "one schema per shape" rule and this milestone's
// "consume only public exports" rule.
export const FinancialProfileSchema = z.object({
  id: z.string(),
  revenueModel: RevenueModelSchema.optional(),
  pricingStrategy: FinancialPricingStrategySchema.optional(),
  costStructure: CostStructureSchema.optional(),
  grossMargin: FinancialEstimateSchema,
  operatingMargin: FinancialEstimateSchema,
  burnRate: FinancialEstimateSchema,
  runway: FinancialEstimateSchema,
  breakEven: FinancialEstimateSchema,
  cac: FinancialEstimateSchema,
  ltv: FinancialEstimateSchema,
  ltvToCac: FinancialEstimateSchema,
  mrr: FinancialEstimateSchema,
  arr: FinancialEstimateSchema,
  paybackPeriod: FinancialEstimateSchema,
  revenueStreams: z.array(RevenueStreamSchema),
  expenses: z.array(ExpenseSchema),
  fundingStage: FundingStageSchema.optional(),
  financialRisks: z.array(FinancialRiskSchema),
  financialAssumptions: z.array(z.string()),
  sources: z.array(SourceSchema),
  evidence: z.array(EvidenceSchema),
  confidence: z.number().min(0).max(100),
  refresh: RefreshMetadataSchema,
});

export type FinancialProfile = z.infer<typeof FinancialProfileSchema>;
