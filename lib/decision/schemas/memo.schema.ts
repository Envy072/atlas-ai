import { z } from "zod";
import { RecommendationSchema } from "@/lib/business";
import { DecisionContextSchema } from "@/lib/decision/schemas/context.schema";
import { BusinessSummarySchema } from "@/lib/decision/schemas/businessSummary.schema";
import { InvestmentThesisSchema } from "@/lib/decision/schemas/thesis.schema";
import { FindingSchema } from "@/lib/decision/schemas/finding.schema";
import { RiskFindingSchema } from "@/lib/decision/schemas/riskFinding.schema";
import { DecisionConfidenceSchema } from "@/lib/decision/schemas/confidence.schema";
import { DecisionReadinessSchema } from "@/lib/decision/schemas/readiness.schema";
import { DecisionVerdictSchema } from "@/lib/decision/schemas/verdict.schema";

// A reusable Investment Memo artifact — a real RESHAPING/selection of an
// already-built DecisionProfile's own fields (see memo/investmentMemo.ts),
// never newly-generated content itself (this schema does not generate
// anything — it only reshapes what its caller already computed).
// `recommendations` reuses lib/business's own Recommendation schema
// (imported from its public barrel) rather than redefining it.
// `deriveRecommendations()` (lib/decision/recommendations/
// recommendationGenerator.ts, Milestone 37) is the one exception to
// "Decision Intelligence never generates" language this comment
// previously used — real recommendations are generated there, then
// supplied to buildInvestmentMemo() by its caller, same as before.
// `verdict` (Milestone 38, additive) is optional, not fabricated when
// absent — mirroring ReadinessAssessment.level's own established
// "absent, not fabricated" optional pattern; see verdict/
// decisionVerdict.ts's deriveVerdict() for how a real one is produced.
export const InvestmentMemoSchema = z.object({
  decisionContext: DecisionContextSchema,
  businessSummary: BusinessSummarySchema,
  investmentThesis: InvestmentThesisSchema,
  keyFindings: z.array(FindingSchema),
  criticalRisks: z.array(RiskFindingSchema),
  recommendations: z.array(RecommendationSchema),
  decisionReadiness: DecisionReadinessSchema,
  confidenceSummary: DecisionConfidenceSchema,
  verdict: DecisionVerdictSchema.optional(),
  generatedAt: z.string(),
});

export type InvestmentMemo = z.infer<typeof InvestmentMemoSchema>;
