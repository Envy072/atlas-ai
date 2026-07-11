import type { FinancialEstimate } from "@/lib/financial/schemas/estimate.schema";
import type { EconomicsContext } from "@/lib/financial/types/economics";

// ARCHITECTURE ONLY. NO FABRICATED NUMBERS. Unit economics — the cost and
// value of acquiring and serving a single customer. Every function
// returns an estimate with `value` deliberately absent — there is no real
// financial-data pipeline yet (no billing-system integration, no CRM
// data), so computing an actual number here would mean inventing one.
// Mirrors lib/market's sizing/marketSizing.ts placeholder discipline.
//
// Each function's signature is the permanent contract; a future
// implementation replaces only the body:
//   - estimateCAC: total sales+marketing spend / new customers acquired,
//     over a real reporting period
//   - estimateLTV: average revenue per customer × average customer
//     lifespan, from real billing/retention data

function buildUnknownEstimate(methodology: string, unit: FinancialEstimate["unit"]): FinancialEstimate {
  return { methodology, unit };
}

export function estimateCAC(context: EconomicsContext): FinancialEstimate {
  return buildUnknownEstimate(
    `Customer acquisition cost for a ${context.revenueModel ?? "not-yet-classified"} revenue model — not yet computed.`,
    "usd"
  );
}

export function estimateLTV(context: EconomicsContext): FinancialEstimate {
  return buildUnknownEstimate(
    `Customer lifetime value for a ${context.revenueModel ?? "not-yet-classified"} revenue model — not yet computed.`,
    "usd"
  );
}
