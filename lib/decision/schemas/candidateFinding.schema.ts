import { z } from "zod";
import { CandidateClaimSchema } from "@/lib/decision/schemas/candidateClaim.schema";
import { FindingCategorySchema } from "@/lib/decision/schemas/enums";
import { SeveritySchema } from "@/lib/market";

// The "larger candidate finding shape" MILESTONE_33_DESIGN.md's own
// design anticipated — extends CandidateClaimSchema (Milestone 33,
// unmodified) rather than redefining summary/citedEvidenceIds by hand,
// adding exactly the fields that schema deliberately excluded:
// category, severity, and confidence, all required by buildFinding()
// (MILESTONE_34_DESIGN.md Section 5).
//
// severity reuses lib/market's own three-level SeveritySchema — the
// exact scale FindingSchema.severity already reuses — never
// RiskFindingSchema's four-level RedFlagSeveritySchema, which belongs
// to CandidateRiskSchema's own candidate-risk shape
// (lib/decision/schemas/candidateRisk.schema.ts, Milestone 35), not
// this one.
export const CandidateFindingSchema = CandidateClaimSchema.extend({
  category: FindingCategorySchema,
  severity: SeveritySchema,
  confidence: z.number().min(0).max(100),
});

export type CandidateFinding = z.infer<typeof CandidateFindingSchema>;
