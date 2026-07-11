import type { FinancialEstimate } from "@/lib/financial/schemas/estimate.schema";
import type { EconomicsContext } from "@/lib/financial/types/economics";

// ARCHITECTURE ONLY. Customer economics — how long it takes a customer's
// revenue to repay the cost of acquiring them. Real future implementation:
// payback period = CAC / (monthly revenue per customer × gross margin).
export function estimatePaybackPeriod(context: EconomicsContext): FinancialEstimate {
  return {
    methodology: `Payback period for a ${context.revenueModel ?? "not-yet-classified"} revenue model — not yet computed.`,
    unit: "months",
  };
}
