import { z } from "zod";

// The traceability contract only — not a complete candidate finding
// (MILESTONE_33_DESIGN.md Section 3/6). Carries exactly what
// verifyClaimTraceability() needs: a claim's text, and the evidence ids
// it claims to be citing. Deliberately does not carry
// category/severity/confidence — those belong to whatever larger
// "candidate finding" shape a future Milestone 34 defines.
//
// citedEvidenceIds may legitimately be an empty array at this schema
// level — a structurally valid but meaningfully rejectable input.
// verifyClaimTraceability() (not this schema) is the single place that
// decides what happens to an uncited claim, with a real, named reason
// attached, rather than collapsing "malformed input" and
// "well-formed-but-uncited" into the same generic validation failure.
export const CandidateClaimSchema = z.object({
  summary: z.string().min(1),
  citedEvidenceIds: z.array(z.string()),
});

export type CandidateClaim = z.infer<typeof CandidateClaimSchema>;
