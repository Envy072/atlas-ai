import {
  createSession,
  getSession,
  cancelSession,
  retrySession,
  CreateSessionInputSchema,
} from "@/lib/analysis-session";
import type { AnalysisSession, CreateSessionInput } from "@/lib/analysis-session";
import { buildVerificationSummaryFromSession } from "@/lib/verification";
import { InvalidRequestError } from "@/lib/errors";
import type { AnalysisSessionView } from "@/lib/schemas/analysisSessionView";

// Re-exported so routes never import lib/analysis-session directly —
// this service is the sole seam permitted to (MILESTONE_14_DESIGN.md
// Section 8). The create route validates the request body against this
// same schema, imported from here.
export { CreateSessionInputSchema };
export type { CreateSessionInput };

// The sole application-layer caller of lib/analysis-session and
// lib/verification (MILESTONE_14_DESIGN.md Section 8) — no route ever
// imports either directly, and this file never imports lib/pipeline or
// lib/decision (Session already wraps Pipeline; DecisionProfile is
// reached structurally through session.result, not by importing
// lib/decision's own types).
function toView(session: AnalysisSession): AnalysisSessionView {
  return {
    session,
    verification: buildVerificationSummaryFromSession(session),
  };
}

export async function startAnalysisSession(input: CreateSessionInput): Promise<AnalysisSessionView> {
  const session = await createSession(input);
  return toView(session);
}

export async function getAnalysisSession(id: string): Promise<AnalysisSessionView | null> {
  const session = await getSession(id);
  if (!session) return null;
  return toView(session);
}

export async function cancelAnalysisSession(id: string): Promise<AnalysisSessionView> {
  if (!id.trim()) {
    throw new InvalidRequestError("A session id is required.");
  }
  const session = await cancelSession(id);
  return toView(session);
}

export async function retryAnalysisSession(id: string): Promise<AnalysisSessionView> {
  if (!id.trim()) {
    throw new InvalidRequestError("A session id is required.");
  }
  const session = await retrySession(id);
  return toView(session);
}
