import type { FinancialEstimate } from "@/lib/financial/schemas/estimate.schema";

// Real, functional composition logic — unlike economics/'s placeholders,
// this genuinely computes a ratio whenever its inputs are real, and
// honestly propagates "unknown" whenever either isn't. The same "real
// composition over not-yet-real inputs" pattern lib/market's
// scoringEngine and lib/research's rankingEngine established: once
// estimateLTV/estimateCAC (economics/unitEconomics.ts) get real
// implementations, this function needs no changes.
export function computeLtvToCacRatio(ltv: FinancialEstimate, cac: FinancialEstimate): FinancialEstimate {
  if (ltv.value === undefined || cac.value === undefined) {
    return {
      methodology: "LTV ÷ CAC — cannot be computed until both LTV and CAC are known.",
      unit: "ratio",
    };
  }

  if (cac.value === 0) {
    return {
      methodology: "LTV ÷ CAC is undefined when CAC is exactly zero.",
      unit: "ratio",
    };
  }

  return {
    value: Math.round((ltv.value / cac.value) * 100) / 100,
    unit: "ratio",
    methodology: "LTV ÷ CAC, computed directly from both known estimates.",
    confidence:
      ltv.confidence !== undefined && cac.confidence !== undefined
        ? Math.min(ltv.confidence, cac.confidence)
        : undefined,
  };
}
