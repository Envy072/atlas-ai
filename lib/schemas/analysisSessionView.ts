import { z } from "zod";
// Milestone 127 — imported from its specific schema file, not
// lib/analysis-session's full public barrel: that barrel also re-exports
// sessionLifecycle.ts's real functions (createSession, getSession, ...),
// which import lib/pipeline's own real orchestration functions
// (startPipeline, ...), which now need lib/shared's AsyncLocalStorage-
// based execution-context helper — the Node-only node:async_hooks. This
// file is imported by hooks/useAnalysisSession.ts (a Client Component,
// re-validating a polled response); a bundler resolving the whole
// lib/analysis-session barrel to reach AnalysisSessionSchema hits that
// dependency even though none of sessionLifecycle.ts's own functions are
// ever called client-side.
import { AnalysisSessionSchema } from "@/lib/analysis-session/schemas/session.schema";
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
