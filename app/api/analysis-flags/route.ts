import { submitAnalysisFlag } from "@/lib/services/analysisFlags";
import { CreateAnalysisFlagInputSchema } from "@/lib/schemas/analysisFlag";
import { getCurrentUser } from "@/lib/services/auth";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError, UnauthorizedError } from "@/lib/errors";

// Thin controller (MILESTONE_39_DESIGN.md Section 8/5): validate the
// request, require an authenticated caller, call the one new service,
// map the result to a response — exactly the shape every existing
// route in this codebase already takes.
//
// Unlike POST /api/analysis-sessions (deliberately public — anonymous
// users may run an analysis), this route requires authentication: a
// flag must be traceable to a real, authenticated cohort member, and
// an anonymous flag against a project the submitter doesn't even own
// would be meaningless noise, not signal (Section 13). This is the
// first route in this codebase to reject an unauthenticated caller
// outright rather than merely reading identity when present.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateAnalysisFlagInputSchema.safeParse(body);

    if (!parsed.success) {
      throw new InvalidRequestError("A valid projectId, category, and description are required.");
    }

    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const flag = await submitAnalysisFlag(parsed.data, user.id);

    return jsonSuccess({ id: flag.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
