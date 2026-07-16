import { z } from "zod";
import { CandidateClaimSchema } from "@/lib/decision/schemas/candidateClaim.schema";
import { FindingCategorySchema, RedFlagSeveritySchema } from "@/lib/decision/schemas/enums";

// The "candidate risk" shape MILESTONE_34_DESIGN.md's own review
// anticipated — extends CandidateClaimSchema (Milestone 33, unmodified)
// exactly as CandidateFindingSchema does, but with severity typed as
// RedFlagSeveritySchema (the four-level scale RiskFindingSchema itself
// requires) rather than Finding's three-level SeveritySchema — the one
// field that must differ (MILESTONE_35_DESIGN.md Section 5).
//
// citedEvidenceIds is inherited from CandidateClaimSchema completely
// unmodified — deliberately not given its own .min(1) constraint here,
// even though RiskFindingSchema.evidence requires at least one entry
// downstream. An empty citedEvidenceIds is already rejected by
// verifyClaimTraceability()'s own first branch before a candidate risk
// ever reaches buildRiskFinding() — a second, schema-level constraint
// here would duplicate a check that gate already performs uniformly
// for every CandidateClaim-shaped input (MILESTONE_35_DESIGN.md
// Section 5).
export const CandidateRiskSchema = CandidateClaimSchema.extend({
  category: FindingCategorySchema,
  severity: RedFlagSeveritySchema,
  confidence: z.number().min(0).max(100),
});

export type CandidateRisk = z.infer<typeof CandidateRiskSchema>;
