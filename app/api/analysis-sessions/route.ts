import { startAnalysisSession, CreateSessionInputSchema } from "@/lib/services/analysisSessions";
import { getCurrentUser } from "@/lib/services/auth";
import { countProjectsThisMonth } from "@/lib/services/projects";
import { FREE_TIER_MONTHLY_ANALYSIS_LIMIT } from "@/lib/services/stripe";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { resolveCallerContext } from "@/lib/api/clientIdentity";
import { assertRequestNotTooLarge } from "@/lib/api/requestSize";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError, UsageLimitExceededError, RateLimitExceededError } from "@/lib/errors";

// The real 6-stage pipeline runs synchronously inside this one request
// (Milestone 45 investigation) and can legitimately take 20-40+
// seconds — well past this platform's default serverless function
// duration. Without this, a real, successful analysis can be cut off
// mid-flight by the platform itself, which the client then
// indistinguishably reports as a generic network error even though the
// server keeps running and persists the result anyway. This is an
// application-level route-segment config (version-controlled, in the
// route file itself), not a change to any external/dashboard
// configuration.
export const maxDuration = 60;

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
//
// As of Milestone 47, also rate-limited under the "analysis:create"
// bucket (lib/services/rateLimit/config.ts) — this route triggers a
// real, money-spending pipeline run per call, the actual abuse vector
// the Milestone 46 review named. Checked before the monthly usage-limit
// query, cheapest-check-first.
export async function POST(req: Request) {
  try {
    assertRequestNotTooLarge(req);
    const body = await req.json();
    const parsed = CreateSessionInputSchema.safeParse(body);

    if (!parsed.success) {
      throw new InvalidRequestError("A valid startupIdea is required to start an analysis.");
    }

    const user = await getCurrentUser();
    const { tier, identity } = await resolveCallerContext(req, user);

    const rateLimit = await checkRateLimit("analysis:create", identity, tier);
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError();
    }

    if (user && tier === "free") {
      const usedThisMonth = await countProjectsThisMonth(user.id, new Date());
      if (usedThisMonth >= FREE_TIER_MONTHLY_ANALYSIS_LIMIT) {
        throw new UsageLimitExceededError();
      }
    }

    const view = await startAnalysisSession(parsed.data, user?.id ?? null);

    return jsonSuccess(view, 201);
  } catch (error) {
    return jsonError(error);
  }
}
