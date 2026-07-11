import { z } from "zod";
import { RecommendationSchema } from "@/lib/business";
import { DecisionContextSchema } from "@/lib/decision/schemas/context.schema";
import { BusinessSummarySchema } from "@/lib/decision/schemas/businessSummary.schema";
import { InvestmentThesisSchema } from "@/lib/decision/schemas/thesis.schema";
import { FindingSchema } from "@/lib/decision/schemas/finding.schema";
import { RiskFindingSchema } from "@/lib/decision/schemas/riskFinding.schema";
import { DecisionConfidenceSchema } from "@/lib/decision/schemas/confidence.schema";
import { DecisionReadinessSchema } from "@/lib/decision/schemas/readiness.schema";

// A reusable Investment Memo artifact — a real RESHAPING/selection of an
// already-built DecisionProfile's own fields (see memo/investmentMemo.ts),
// never newly-generated content. `recommendations` reuses lib/business's
// own Recommendation schema (imported from its public barrel) rather than
// redefining it — Decision Intelligence never generates a recommendation,
// only aggregates ones supplied by a caller (see recommendations/).
export const InvestmentMemoSchema = z.object({
  decisionContext: DecisionContextSchema,
  businessSummary: BusinessSummarySchema,
  investmentThesis: InvestmentThesisSchema,
  keyFindings: z.array(FindingSchema),
  criticalRisks: z.array(RiskFindingSchema),
  recommendations: z.array(RecommendationSchema),
  decisionReadiness: DecisionReadinessSchema,
  confidenceSummary: DecisionConfidenceSchema,
  generatedAt: z.string(),
});

export type InvestmentMemo = z.infer<typeof InvestmentMemoSchema>;
