import type { FinancialEstimate } from "@/lib/financial/schemas/estimate.schema";
import type { EconomicsContext } from "@/lib/financial/types/economics";

// ARCHITECTURE ONLY. Growth economics — recurring revenue run-rate. Real
// future implementation: MRR summed directly from real subscription/
// billing data; ARR = MRR × 12 (once MRR is real, not before).
export function estimateMRR(context: EconomicsContext): FinancialEstimate {
  return {
    methodology: `Monthly recurring revenue for a ${context.revenueModel ?? "not-yet-classified"} revenue model — not yet computed.`,
    unit: "usd_per_month",
  };
}

export function estimateARR(context: EconomicsContext): FinancialEstimate {
  return {
    methodology: `Annual recurring revenue (12× MRR) for a ${context.revenueModel ?? "not-yet-classified"} revenue model — not yet computed.`,
    unit: "usd",
  };
}
