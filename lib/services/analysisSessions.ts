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
// actually completed AND a real user id is provided (Milestone 27c: a
// null userId means "anonymous," which now means "never persisted," not
// "persisted with no owner"), and is insert-only/idempotent per session
// id (never an upsert), so calling it on every view composition — an
// initial start, a poll, a cancel, a retry — is always safe and never
// overwrites an already-persisted snapshot.
//
// userId is passed through from whichever route called in — this file
// never calls getCurrentUser() itself (that would import next/headers
// into an otherwise framework-agnostic file for no reason; the route
// layer already has it). None of the four analysis-session routes
// require a user (they stay public, per the approved anonymous-analysis
// decision) — userId is read and forwarded, never enforced, here.
async function toView(session: AnalysisSession, userId: string | null): Promise<AnalysisSessionView> {
  const view: AnalysisSessionView = {
    session,
    verification: buildVerificationSummaryFromSession(session),
  };

  await persistProjectFromSession(view, userId);

  return view;
}

export async function startAnalysisSession(
  input: CreateSessionInput,
  userId: string | null
): Promise<AnalysisSessionView> {
  const session = await createSession(input);
  return toView(session, userId);
}

export async function getAnalysisSession(
  id: string,
  userId: string | null
): Promise<AnalysisSessionView | null> {
  const session = await getSession(id);
  if (!session) return null;
  return toView(session, userId);
}

export async function cancelAnalysisSession(
  id: string,
  userId: string | null
): Promise<AnalysisSessionView> {
  if (!id.trim()) {
    throw new InvalidRequestError("A session id is required.");
  }
  const session = await cancelSession(id);
  return toView(session, userId);
}

export async function retryAnalysisSession(
  id: string,
  userId: string | null
): Promise<AnalysisSessionView> {
  if (!id.trim()) {
    throw new InvalidRequestError("A session id is required.");
  }
  const session = await retrySession(id);
  return toView(session, userId);
}
