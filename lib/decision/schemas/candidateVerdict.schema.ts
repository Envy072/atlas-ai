import { z } from "zod";
import { CandidateClaimSchema } from "@/lib/decision/schemas/candidateClaim.schema";
import { VerdictCategorySchema } from "@/lib/decision/schemas/enums";

// The "candidate verdict" shape (MILESTONE_38_DESIGN.md Section 5) —
// extends CandidateClaimSchema (Milestone 33, unmodified) with only
// `category`. Deliberately has NO `confidence` field, the one
// departure from every prior CandidateX schema's own shape:
// DecisionVerdict's own confidence is mechanically computed downstream
// (verdict/decisionVerdict.ts's computeVerdictConfidence()), never
// model-generated — giving the model a confidence field here would
// create two competing numbers with no principled way to reconcile
// them.
export const CandidateVerdictSchema = CandidateClaimSchema.extend({
  category: VerdictCategorySchema,
});

export type CandidateVerdict = z.infer<typeof CandidateVerdictSchema>;
