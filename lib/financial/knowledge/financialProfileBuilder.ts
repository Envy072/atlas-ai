import type { Source, Evidence } from "@/lib/research";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import { FinancialProfileSchema } from "@/lib/financial/schemas/financial.schema";
import type { RevenueModel, RevenueStream } from "@/lib/financial/schemas/revenue.schema";
import type { CostStructure, Expense } from "@/lib/financial/schemas/costs.schema";
import type { FinancialPricingStrategy } from "@/lib/financial/schemas/pricing.schema";
import type { FundingStage } from "@/lib/financial/schemas/fundingStage.schema";
import type { FinancialRisk } from "@/lib/financial/schemas/risk.schema";
import type { EconomicsContext } from "@/lib/financial/types/economics";
import {
  estimateBreakEven,
  estimateBurnRate,
  estimateGrossMargin,
  estimateOperatingMargin,
  estimateRunway,
} from "@/lib/financial/economics/operatingEconomics";
import { estimateCAC, estimateLTV } from "@/lib/financial/economics/unitEconomics";
import { estimatePaybackPeriod } from "@/lib/financial/economics/customerEconomics";
import { estimateARR, estimateMRR } from "@/lib/financial/economics/growthEconomics";
import { computeLtvToCacRatio } from "@/lib/financial/metrics/ltvToCacRatio";
import { buildFinancialRefreshMetadata } from "@/lib/financial/refresh/financialRefreshPolicy";
import { parseOrThrow } from "@/lib/validation/parse";

let financialIdCounter = 0;

function nextFinancialId(): string {
  financialIdCounter += 1;
  return `financial_${Date.now()}_${financialIdCounter}`;
}

export interface BuildFinancialProfileInput {
  revenueModel?: RevenueModel;
  pricingStrategy?: FinancialPricingStrategy;
  costStructure?: CostStructure;
  revenueStreams?: RevenueStream[];
  expenses?: Expense[];
  fundingStage?: FundingStage;
  financialRisks?: FinancialRisk[];
  financialAssumptions?: string[];
  sources?: Source[];
  evidence?: Evidence[];
  confidence: number;
  economicsContext?: EconomicsContext;
  now?: Date;
}

// The one place a brand-new FinancialProfile gets constructed — mirrors
// lib/competitors' buildCompanyProfile and lib/market's buildMarketProfile
// exactly. Every FinancialEstimate field is populated from economics/'s
// (currently placeholder, honestly-unknown) estimators rather than left
// undefined, so the profile always carries a documented methodology note
// per metric — never a silently-missing field.
export function buildFinancialProfile(input: BuildFinancialProfileInput): FinancialProfile {
  const now = input.now ?? new Date();
  const context: EconomicsContext = input.economicsContext ?? { revenueModel: input.revenueModel };

  const ltv = estimateLTV(context);
  const cac = estimateCAC(context);

  return parseOrThrow(
    FinancialProfileSchema,
    {
      id: nextFinancialId(),
      revenueModel: input.revenueModel,
      pricingStrategy: input.pricingStrategy,
      costStructure: input.costStructure,
      grossMargin: estimateGrossMargin(context),
      operatingMargin: estimateOperatingMargin(context),
      burnRate: estimateBurnRate(context),
      runway: estimateRunway(context),
      breakEven: estimateBreakEven(context),
      cac,
      ltv,
      ltvToCac: computeLtvToCacRatio(ltv, cac),
      mrr: estimateMRR(context),
      arr: estimateARR(context),
      paybackPeriod: estimatePaybackPeriod(context),
      revenueStreams: input.revenueStreams ?? [],
      expenses: input.expenses ?? [],
      fundingStage: input.fundingStage,
      financialRisks: input.financialRisks ?? [],
      financialAssumptions: input.financialAssumptions ?? [],
      sources: input.sources ?? [],
      evidence: input.evidence ?? [],
      confidence: input.confidence,
      refresh: buildFinancialRefreshMetadata("initial_discovery", input.confidence, now),
    },
    "Failed to build a schema-valid FinancialProfile."
  );
}
