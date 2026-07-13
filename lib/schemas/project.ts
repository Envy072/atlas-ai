import { z } from "zod";
import { DecisionProfileSchema } from "@/lib/decision";
import { VerificationSummarySchema } from "@/lib/verification";

// The durable, user-facing record of one completed analysis
// (MILESTONE_26_DESIGN.md Section 3.4) — composed entirely from two
// already-public schemas, never redefining either. `profile`/
// `verification` are immutable snapshots taken at the moment a session
// is first observed as completed, not a live view of the session that
// produced them (Section 3.3): re-reading this row later must always
// return exactly what was true at that moment. `ownerId` is reserved,
// unused (always null) until Authentication exists — an additive column
// with nothing to populate it yet, not a speculative feature.
export const ProjectSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  executionId: z.string(),
  title: z.string().min(1),
  createdAt: z.string(),
  ownerId: z.string().nullable(),
  profile: DecisionProfileSchema,
  verification: VerificationSummarySchema,
});

export type Project = z.infer<typeof ProjectSchema>;
