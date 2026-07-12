import { cancelAnalysisSession } from "@/lib/services/analysisSessions";
import { jsonSuccess, jsonError } from "@/lib/api/response";

// Cooperative, stage-boundary-only cancellation (inherited unchanged from
// lib/pipeline via lib/analysis-session — MILESTONE_14_DESIGN.md Section
// 7.3): the response reflects "cancelling" immediately, not "cancelled".
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const view = await cancelAnalysisSession(id);

    return jsonSuccess(view);
  } catch (error) {
    return jsonError(error);
  }
}
