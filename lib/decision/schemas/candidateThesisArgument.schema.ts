import { z } from "zod";
import { CandidateClaimSchema } from "@/lib/decision/schemas/candidateClaim.schema";
import { ThesisArgumentKindSchema } from "@/lib/decision/schemas/enums";

// Extends CandidateClaimSchema (Milestone 33, unmodified) with exactly
// one new field, `kind` — the axis that determines which of
// InvestmentThesis's four arrays a matched argument's summary is
// bucketed into (MILESTONE_36_DESIGN.md Section 5). Deliberately no
// `category`/`severity`/`confidence` fields, unlike CandidateFinding/
// CandidateRisk — InvestmentThesisSchema has no corresponding place to
// put any of them.
//
// citedEvidenceIds is inherited from CandidateClaimSchema completely
// unmodified — an "unknown" or a "contradiction" argument must cite
// real evidence too, with no special-casing: an empty citedEvidenceIds
// is already rejected by verifyClaimTraceability()'s own first branch,
// uniformly, for every CandidateClaim-shaped input, including this one
// (MILESTONE_36_DESIGN.md Section 5).
export const CandidateThesisArgumentSchema = CandidateClaimSchema.extend({
  kind: ThesisArgumentKindSchema,
});

export type CandidateThesisArgument = z.infer<typeof CandidateThesisArgumentSchema>;
