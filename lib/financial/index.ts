// Public entry point for the Financial Intelligence Platform. Every
// future module this milestone anticipates (Business Model Intelligence,
// Investor Intelligence, Reports, Dashboard, API — see
// FINANCIAL_PLATFORM.md's Future Roadmap) should import from here, never
// from a deep path into a specific subfolder — the same discipline
// lib/competitors', lib/market's, and lib/research's public barrels
// enforce for themselves.
export { buildFinancialProfile } from "@/lib/financial/knowledge/financialProfileBuilder";
export { mergeFinancialProfile } from "@/lib/financial/knowledge/profileMerger";
export { discoverFinancials } from "@/lib/financial/knowledge/financialDiscovery";

export {
  estimateGrossMargin,
  estimateOperatingMargin,
  estimateBurnRate,
  estimateRunway,
  estimateBreakEven,
} from "@/lib/financial/economics/operatingEconomics";
export { estimateCAC, estimateLTV } from "@/lib/financial/economics/unitEconomics";
export { estimatePaybackPeriod } from "@/lib/financial/economics/customerEconomics";
export { estimateMRR, estimateARR } from "@/lib/financial/economics/growthEconomics";

export { computeLtvToCacRatio } from "@/lib/financial/metrics/ltvToCacRatio";

export { buildPricingStrategy } from "@/lib/financial/pricing/pricingStrategy";
export { buildRevenueStream } from "@/lib/financial/revenue/revenueStream";
export { buildExpense } from "@/lib/financial/costs/expense";
export { buildCostStructure } from "@/lib/financial/costs/costStructure";
export { buildFinancialRisk } from "@/lib/financial/risk/financialRisk";

export { buildForecastModel, buildForecastSet } from "@/lib/financial/forecast/forecastEngine";
export {
  estimateRevenueMultiple,
  estimateEBITDAMultiple,
  estimateDCF,
  estimateVentureMethod,
  buildValuationEstimates,
} from "@/lib/financial/valuation/valuationModels";

export { scoreFinancials } from "@/lib/financial/scoring/scoringEngine";

export {
  requestManualRefresh,
  requestScheduledRefresh,
  requestStaleRefresh,
  collectStaleFinancials,
} from "@/lib/financial/refresh/financialRefreshEngine";
export { isFinancialStale } from "@/lib/financial/refresh/financialRefreshPolicy";

export { createStore } from "@/lib/financial/storage/createStore";
export { MemoryFinancialStore } from "@/lib/financial/storage/memoryStore";

export * from "@/lib/financial/schemas";
export * from "@/lib/financial/types";
