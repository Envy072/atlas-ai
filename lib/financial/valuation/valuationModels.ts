import type { FinancialEstimate } from "@/lib/financial/schemas/estimate.schema";
import type { ValuationEstimate, ValuationMethod } from "@/lib/financial/schemas/valuation.schema";
import type { EconomicsContext } from "@/lib/financial/types/economics";

// ARCHITECTURE ONLY. NO IMPLEMENTATION YET — per this milestone's
// explicit rule. Each function's signature is the permanent contract a
// future implementation fills in:
//   - estimateRevenueMultiple: ARR × an industry-appropriate revenue
//     multiple (once ARR is real and comparable multiples are sourced)
//   - estimateEBITDAMultiple: EBITDA × an industry-appropriate multiple
//     (requires real profitability data this platform doesn't have yet)
//   - estimateDCF: discounted cash flow from a real multi-year projection
//     (requires forecast/ to produce real, not placeholder, projections)
//   - estimateVentureMethod: exit value ÷ required ROI, discounted by
//     probability of success (a VC-style method requiring a real exit
//     comparable and a real forecast)

function buildUnimplementedEstimate(method: ValuationMethod): FinancialEstimate {
  return {
    methodology: `${method.replace(/_/g, " ")} valuation — no implementation yet.`,
  };
}

export function estimateRevenueMultiple(context: EconomicsContext): FinancialEstimate {
  void context;
  return buildUnimplementedEstimate("revenue_multiple");
}

export function estimateEBITDAMultiple(context: EconomicsContext): FinancialEstimate {
  void context;
  return buildUnimplementedEstimate("ebitda_multiple");
}

export function estimateDCF(context: EconomicsContext): FinancialEstimate {
  void context;
  return buildUnimplementedEstimate("dcf");
}

export function estimateVentureMethod(context: EconomicsContext): FinancialEstimate {
  void context;
  return buildUnimplementedEstimate("venture_method");
}

const VALUATION_ESTIMATORS: Record<ValuationMethod, (context: EconomicsContext) => FinancialEstimate> = {
  revenue_multiple: estimateRevenueMultiple,
  ebitda_multiple: estimateEBITDAMultiple,
  dcf: estimateDCF,
  venture_method: estimateVentureMethod,
};

const ALL_METHODS = Object.keys(VALUATION_ESTIMATORS) as ValuationMethod[];

// Builds every valuation method's (currently unimplemented) estimate at
// once — the shape a future valuation UI would render side by side.
export function buildValuationEstimates(context: EconomicsContext = {}): ValuationEstimate[] {
  return ALL_METHODS.map((method) => ({
    method,
    estimate: VALUATION_ESTIMATORS[method](context),
  }));
}
