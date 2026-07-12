import { z } from "zod";
import { AnalysisSessionSchema } from "@/lib/analysis-session";
import { VerificationSummarySchema } from "@/lib/verification";

// The one new shape this milestone introduces — composed entirely from
// two already-public schemas, never redefining either
// (MILESTONE_14_DESIGN.md Section 5). `verification` is null until the
// session completes, mirroring buildVerificationSummaryFromSession's own
// null-until-complete contract unchanged.
export const AnalysisSessionViewSchema = z.object({
  session: AnalysisSessionSchema,
  verification: VerificationSummarySchema.nullable(),
});

export type AnalysisSessionView = z.infer<typeof AnalysisSessionViewSchema>;
