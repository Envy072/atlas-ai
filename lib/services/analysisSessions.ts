import {
  createSession,
  getSession,
  cancelSession,
  retrySession,
  CreateSessionInputSchema,
} from "@/lib/analysis-session";
import type { AnalysisSession, CreateSessionInput } from "@/lib/analysis-session";
import { buildVerificationSummaryFromSession } from "@/lib/verification";
import { persistProjectFromSession } from "@/lib/services/projects";
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
//
// Also the one seam that persists a completed session as a Project
// (MILESTONE_26_DESIGN.md Section 3.1) — every exported function below
// funnels through here, so persistence is attempted uniformly on every
// observation of a session's view, not just the polling GET path.
// persistProjectFromSession is itself a no-op unless the session is
// actually completed, and is insert-only/idempotent per session id
// (never an upsert), so calling it on every view composition — an
// initial start, a poll, a cancel, a retry — is always safe and never
// overwrites an already-persisted snapshot.
async function toView(session: AnalysisSession): Promise<AnalysisSessionView> {
  const view: AnalysisSessionView = {
    session,
    verification: buildVerificationSummaryFromSession(session),
  };

  await persistProjectFromSession(view);

  return view;
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
