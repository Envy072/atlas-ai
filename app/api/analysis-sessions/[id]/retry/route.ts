import { retryAnalysisSession } from "@/lib/services/analysisSessions";
import { getCurrentUser } from "@/lib/services/auth";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { resolveCallerContext } from "@/lib/api/clientIdentity";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { RateLimitExceededError } from "@/lib/errors";

// Retries only the current failed stage, not the whole pipeline
// (inherited unchanged from lib/pipeline via lib/analysis-session —
// MILESTONE_14_DESIGN.md Section 7.4).
//
// Stays fully public, same reasoning as the sibling routes in this
// folder (Milestone 27's approved anonymous-analysis decision).
// Rate-limited under "analysis:mutate" (Milestone 47).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const { tier, identity } = await resolveCallerContext(req, user);

    const rateLimit = await checkRateLimit("analysis:mutate", identity, tier);
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError();
    }

    const view = await retryAnalysisSession(id, user?.id ?? null);

    return jsonSuccess(view);
  } catch (error) {
    return jsonError(error);
  }
}
