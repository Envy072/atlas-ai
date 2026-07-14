import { getAnalysisSession } from "@/lib/services/analysisSessions";
import { getCurrentUser } from "@/lib/services/auth";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError } from "@/lib/errors";

// Polled by the client on a fixed interval while a session isn't terminal
// (MILESTONE_14_DESIGN.md Section 7.2). Not-found uses InvalidRequestError,
// matching the exact convention lib/analysis-session's own
// loadRecordOrThrow already established for "no session/execution found".
//
// Stays fully public — anonymous users may view their generated report
// (Milestone 27's approved product decision). See
// app/api/analysis-sessions/route.ts's own comment for why
// getCurrentUser() is called here without gating anything on it.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const view = await getAnalysisSession(id, user?.id ?? null);

    if (!view) {
      throw new InvalidRequestError(`No analysis session found for id "${id}".`);
    }

    return jsonSuccess(view);
  } catch (error) {
    return jsonError(error);
  }
}
