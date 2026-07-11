// What the economics/ estimators need to document a methodology note —
// not a Zod-validated data shape (never crosses a schema boundary itself,
// only feeds text into a FinancialEstimate), mirrors lib/market's
// MarketSizingContext.
export interface EconomicsContext {
  industry?: string;
  revenueModel?: string;
}
