import { getAnalysisSession } from "@/lib/services/analysisSessions";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError } from "@/lib/errors";

// Polled by the client on a fixed interval while a session isn't terminal
// (MILESTONE_14_DESIGN.md Section 7.2). Not-found uses InvalidRequestError,
// matching the exact convention lib/analysis-session's own
// loadRecordOrThrow already established for "no session/execution found".
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const view = await getAnalysisSession(id);

    if (!view) {
      throw new InvalidRequestError(`No analysis session found for id "${id}".`);
    }

    return jsonSuccess(view);
  } catch (error) {
    return jsonError(error);
  }
}
