import type { Recommendation } from "@/lib/business";
import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { InvestmentMemo } from "@/lib/decision/schemas/memo.schema";
import { InvestmentMemoSchema } from "@/lib/decision/schemas/memo.schema";
import { parseOrThrow } from "@/lib/validation/parse";

// Reshapes an already-built DecisionProfile into the Investment Memo
// consumer's expected shape — a real SELECTION of existing fields, never
// newly-generated content. `recommendations` defaults to empty since
// Decision Intelligence never generates one itself; a caller supplies
// real ones (aggregated via recommendations/recommendationAggregator.ts)
// once a future module produces them.
export function buildInvestmentMemo(
  profile: DecisionProfile,
  recommendations: Recommendation[] = []
): InvestmentMemo {
  return parseOrThrow(
    InvestmentMemoSchema,
    {
      decisionContext: profile.decisionContext,
      businessSummary: profile.businessSummary,
      investmentThesis: profile.investmentThesis,
      keyFindings: profile.keyFindings,
      criticalRisks: profile.criticalRisks,
      recommendations,
      decisionReadiness: profile.decisionReadiness,
      confidenceSummary: profile.confidenceSummary,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid InvestmentMemo."
  );
}
