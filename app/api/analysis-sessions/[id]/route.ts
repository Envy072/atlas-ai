import { getAnalysisSession } from "@/lib/services/analysisSessions";
import { getCurrentUser } from "@/lib/services/auth";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { resolveCallerContext } from "@/lib/api/clientIdentity";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError, RateLimitExceededError } from "@/lib/errors";

// Polled by the client on a fixed interval while a session isn't terminal
// (MILESTONE_14_DESIGN.md Section 7.2). Not-found uses InvalidRequestError,
// matching the exact convention lib/analysis-session's own
// loadRecordOrThrow already established for "no session/execution found"
// — and, as of Milestone 47, for "exists but belongs to someone else"
// too (getAnalysisSession returns null for both, deliberately
// indistinguishable — see sessionLifecycle.ts's assertAccessible()).
//
// Stays fully public — anonymous users may view their generated report
// (Milestone 27's approved product decision). See
// app/api/analysis-sessions/route.ts's own comment for why
// getCurrentUser() is called here without gating anything on it.
//
// Rate-limited under "analysis:read" (Milestone 47) — the limit itself
// (100/min) is set from this route's own real, measured polling
// behavior (lib/services/rateLimit/config.ts's own comment), not a
// guess, since this route is legitimately polled every ~1.75s by an
// active session.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const { tier, identity } = await resolveCallerContext(req, user);

    const rateLimit = await checkRateLimit("analysis:read", identity, tier);
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError();
    }

    const view = await getAnalysisSession(id, user?.id ?? null);

    if (!view) {
      throw new InvalidRequestError(`No analysis session found for id "${id}".`);
    }

    return jsonSuccess(view);
  } catch (error) {
    return jsonError(error);
  }
}
