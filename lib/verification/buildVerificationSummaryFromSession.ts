import type { AnalysisSession } from "@/lib/analysis-session";
import { buildVerificationSummary } from "@/lib/verification/buildVerificationSummary";
import type { VerificationSummary } from "@/lib/verification/schemas/verification.schema";

// A session that hasn't reached a completed DecisionProfile yet has
// nothing to verify — returns null rather than a partially-built summary
// (MILESTONE_13_DESIGN.md Section 5). This is the only place in the
// module that depends on lib/analysis-session; buildVerificationSummary
// itself depends only on lib/decision.
export function buildVerificationSummaryFromSession(session: AnalysisSession): VerificationSummary | null {
  if (!session.result) return null;
  return buildVerificationSummary(session.result.profile);
}
