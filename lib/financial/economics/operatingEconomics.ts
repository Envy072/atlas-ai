import type { FinancialEstimate } from "@/lib/financial/schemas/estimate.schema";
import type { EconomicsContext } from "@/lib/financial/types/economics";

// ARCHITECTURE ONLY. Operating economics — the day-to-day cost/margin
// picture of running the business. Real future implementation:
//   - estimateGrossMargin: (revenue − COGS) / revenue, from real P&L data
//   - estimateOperatingMargin: (revenue − operating expenses) / revenue
//   - estimateBurnRate: net cash outflow per month, from real bank/
//     accounting data
//   - estimateRunway: cash on hand / burn rate (once burn rate is real)
//   - estimateBreakEven: months until revenue covers total costs, from a
//     real cost structure + growth trajectory
function buildUnknownEstimate(methodology: string, unit: FinancialEstimate["unit"]): FinancialEstimate {
  return { methodology, unit };
}

export function estimateGrossMargin(context: EconomicsContext): FinancialEstimate {
  return buildUnknownEstimate(
    `Gross margin for a ${context.industry ?? "not-yet-classified"} business — not yet computed.`,
    "percent"
  );
}

export function estimateOperatingMargin(context: EconomicsContext): FinancialEstimate {
  return buildUnknownEstimate(
    `Operating margin for a ${context.industry ?? "not-yet-classified"} business — not yet computed.`,
    "percent"
  );
}

export function estimateBurnRate(context: EconomicsContext): FinancialEstimate {
  return buildUnknownEstimate(
    `Monthly cash burn for a ${context.industry ?? "not-yet-classified"} business — not yet computed.`,
    "usd_per_month"
  );
}

export function estimateRunway(context: EconomicsContext): FinancialEstimate {
  return buildUnknownEstimate(
    `Cash-on-hand ÷ burn rate for a ${context.industry ?? "not-yet-classified"} business — not yet computed.`,
    "months"
  );
}

export function estimateBreakEven(context: EconomicsContext): FinancialEstimate {
  return buildUnknownEstimate(
    `Time to break-even for a ${context.industry ?? "not-yet-classified"} business — not yet computed.`,
    "months"
  );
}
