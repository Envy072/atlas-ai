import { startAnalysisSession, CreateSessionInputSchema } from "@/lib/services/analysisSessions";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError } from "@/lib/errors";

// Thin controller (MILESTONE_14_DESIGN.md Section 13/22): validate the
// request, call the one new service, map the result to a response —
// exactly the shape every existing route in this codebase already takes.
// Bad *caller input* is InvalidRequestError (400), matching
// app/api/chat/route.ts's own existing convention — ValidationError
// (502, per lib/errors/AppError.ts) is reserved for a response that
// doesn't match an expected shape (an AI/upstream output), not for
// rejecting a malformed request body.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateSessionInputSchema.safeParse(body);

    if (!parsed.success) {
      throw new InvalidRequestError("A valid startupIdea is required to start an analysis.");
    }

    const view = await startAnalysisSession(parsed.data);

    return jsonSuccess(view, 201);
  } catch (error) {
    return jsonError(error);
  }
}
