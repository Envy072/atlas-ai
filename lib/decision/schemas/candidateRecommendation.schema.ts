import { z } from "zod";
import { CandidateClaimSchema } from "@/lib/decision/schemas/candidateClaim.schema";
import { RecommendationCategorySchema, RecommendationPrioritySchema } from "@/lib/business";

// Extends CandidateClaimSchema (Milestone 33, unmodified) with
// category/priority reused verbatim from @/lib/business — never
// redefined — matching Recommendation's own existing shape exactly
// (MILESTONE_37_DESIGN.md Section 5). No separate `reason` field:
// CandidateClaimSchema's own `summary` fills that role, mapped
// directly into Recommendation.reason at construction time.
//
// citedEvidenceIds is inherited from CandidateClaimSchema completely
// unmodified — a recommendation must cite real evidence too, with no
// special-casing: an empty citedEvidenceIds is already rejected by
// verifyClaimTraceability()'s own first branch, uniformly, for every
// CandidateClaim-shaped input, including this one.
export const CandidateRecommendationSchema = CandidateClaimSchema.extend({
  category: RecommendationCategorySchema,
  priority: RecommendationPrioritySchema,
  confidence: z.number().min(0).max(100),
});

export type CandidateRecommendation = z.infer<typeof CandidateRecommendationSchema>;
