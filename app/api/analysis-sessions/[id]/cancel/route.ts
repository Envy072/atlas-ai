import { cancelAnalysisSession } from "@/lib/services/analysisSessions";
import { getCurrentUser } from "@/lib/services/auth";
import { jsonSuccess, jsonError } from "@/lib/api/response";

// Cooperative, stage-boundary-only cancellation (inherited unchanged from
// lib/pipeline via lib/analysis-session — MILESTONE_14_DESIGN.md Section
// 7.3): the response reflects "cancelling" immediately, not "cancelled".
//
// Stays fully public, same reasoning as the sibling routes in this
// folder (Milestone 27's approved anonymous-analysis decision).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const view = await cancelAnalysisSession(id, user?.id ?? null);

    return jsonSuccess(view);
  } catch (error) {
    return jsonError(error);
  }
}
