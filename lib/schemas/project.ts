import { z } from "zod";
import { DecisionProfileSchema, DecisionArtifactsSchema } from "@/lib/decision";
import { VerificationSummarySchema } from "@/lib/verification";

// The durable, user-facing record of one completed analysis
// (MILESTONE_26_DESIGN.md Section 3.4) — composed entirely from
// already-public schemas, never redefining any of them. `profile`/
// `verification` are immutable snapshots taken at the moment a session
// is first observed as completed, not a live view of the session that
// produced them (Section 3.3): re-reading this row later must always
// return exactly what was true at that moment. `ownerId` is reserved,
// unused (always null) until Authentication exists — an additive column
// with nothing to populate it yet, not a speculative feature.
//
// `decisionArtifacts` (Milestone 115) is the same kind of immutable
// snapshot, computed once at persistProjectFromSession() time and never
// recomputed — nullable because a row written before this milestone has
// no way to retroactively recover what a since-changed model would have
// generated at the time; those rows read as "not yet available," the
// same honest-empty state already used when there's genuinely nothing
// to assemble a verdict from.
export const ProjectSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  executionId: z.string(),
  title: z.string().min(1),
  createdAt: z.string(),
  ownerId: z.string().nullable(),
  profile: DecisionProfileSchema,
  verification: VerificationSummarySchema,
  decisionArtifacts: DecisionArtifactsSchema.nullable(),
});

export type Project = z.infer<typeof ProjectSchema>;
