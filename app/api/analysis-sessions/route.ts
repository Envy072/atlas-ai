import { startAnalysisSession, CreateSessionInputSchema } from "@/lib/services/analysisSessions";
import { getCurrentUser } from "@/lib/services/auth";
import { countProjectsThisMonth } from "@/lib/services/projects";
import { getUserTier, FREE_TIER_MONTHLY_ANALYSIS_LIMIT } from "@/lib/services/stripe";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError, UsageLimitExceededError } from "@/lib/errors";

// Thin controller (MILESTONE_14_DESIGN.md Section 13/22): validate the
// request, call the one new service, map the result to a response —
// exactly the shape every existing route in this codebase already takes.
// Bad *caller input* is InvalidRequestError (400), matching
// app/api/chat/route.ts's own existing convention — ValidationError
// (502, per lib/errors/AppError.ts) is reserved for a response that
// doesn't match an expected shape (an AI/upstream output), not for
// rejecting a malformed request body.
//
// Stays fully public — anonymous users may run an analysis (Milestone
// 27's approved product decision, re-confirmed at Milestone 27b/27c).
// getCurrentUser() is called only to *read* identity, never to require
// it: a null result is passed straight through, and
// startAnalysisSession/persistProjectFromSession already treat a null
// user id as "don't persist," not as an error.
//
// As of Milestone 44, a signed-in Free-tier user is additionally capped
// at FREE_TIER_MONTHLY_ANALYSIS_LIMIT analyses per calendar month — an
// anonymous caller has no user id to meter against and is unaffected,
// exactly as before.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateSessionInputSchema.safeParse(body);

    if (!parsed.success) {
      throw new InvalidRequestError("A valid startupIdea is required to start an analysis.");
    }

    const user = await getCurrentUser();

    if (user) {
      const tier = await getUserTier(user.id);
      if (tier === "free") {
        const usedThisMonth = await countProjectsThisMonth(user.id, new Date());
        if (usedThisMonth >= FREE_TIER_MONTHLY_ANALYSIS_LIMIT) {
          throw new UsageLimitExceededError();
        }
      }
    }

    const view = await startAnalysisSession(parsed.data, user?.id ?? null);

    return jsonSuccess(view, 201);
  } catch (error) {
    return jsonError(error);
  }
}
