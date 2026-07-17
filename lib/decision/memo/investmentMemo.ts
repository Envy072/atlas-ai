import type { Recommendation } from "@/lib/business";
import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { InvestmentMemo } from "@/lib/decision/schemas/memo.schema";
import { InvestmentMemoSchema } from "@/lib/decision/schemas/memo.schema";
import type { DecisionVerdict } from "@/lib/decision/schemas/verdict.schema";
import { parseOrThrow } from "@/lib/validation/parse";

// Reshapes an already-built DecisionProfile into the Investment Memo
// consumer's expected shape — a real SELECTION of existing fields, never
// newly-generated content itself. `recommendations` defaults to empty
// since this function does not generate one itself; a caller supplies
// real ones — as of Milestone 37, `deriveRecommendations()`
// (lib/decision/recommendations/recommendationGenerator.ts) is exactly
// such a caller, and as of Milestone 38, so is
// lib/decision/artifacts/decisionArtifacts.ts's buildDecisionArtifacts(),
// which supplies both `recommendations` and `verdict` together.
// `verdict` (Milestone 38, additive, optional) is threaded straight
// into the schema-validated object with no reshaping of its own — a
// caller that omits it gets an honest `undefined`, never a fabricated
// placeholder.
export function buildInvestmentMemo(
  profile: DecisionProfile,
  recommendations: Recommendation[] = [],
  verdict?: DecisionVerdict
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
      verdict,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid InvestmentMemo."
  );
}
