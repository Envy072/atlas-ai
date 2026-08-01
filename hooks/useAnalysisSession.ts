"use client";

import { useCallback, useEffect, useRef } from "react";
import { postJSON, getJSON } from "@/lib/http/apiClient";
import { parseOrThrow } from "@/lib/validation/parse";
import { describeError } from "@/lib/errors/messages";
import type { UserFacingError } from "@/lib/errors/messages";
import { AnalysisSessionViewSchema } from "@/lib/schemas/analysisSessionView";
import type { AnalysisSessionView } from "@/lib/schemas/analysisSessionView";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { SessionState } from "@/lib/analysis-session";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

const POLL_INTERVAL_MS = 1750;

// Session's own terminal states (MILESTONE_12_DESIGN.md) — a small local
// check, not a deep import: isTerminalState is lib/pipeline's own helper
// and isn't re-exported from lib/analysis-session's public barrel, so the
// application layer names its own equivalent for Session's vocabulary
// instead of reaching past Session into Pipeline for it.
const TERMINAL_STATES = new Set<SessionState>(["completed", "cancelled", "failed"]);

// Exported so callers rendering different UI for a terminal vs. active
// session (e.g. AIWorkspace) reuse this one check instead of each
// re-deriving their own copy of Session's terminal-state set.
export function isTerminalSessionState(state: SessionState): boolean {
  return TERMINAL_STATES.has(state);
}

// Milestone 123 — the one place a terminal Session state becomes a
// product event, called from every code path that can observe one
// (poll()'s own recurring response, cancel()'s immediate response, and
// start()'s own initial response in the rare case an analysis is
// already terminal on its very first response) — never duplicated as
// three separate switch statements. Deliberately does NOT fire for a
// caught fetch/network exception in any of this hook's own catch
// blocks below: those are a different failure class (this hook's own
// call to our API broke) from "the AI pipeline itself reached state:
// failed" — the latter is what ANALYSIS_FAILED means here.
function trackTerminalState(state: SessionState): void {
  if (state === "completed") trackEvent(ANALYTICS_EVENTS.ANALYSIS_COMPLETED);
  else if (state === "failed") trackEvent(ANALYTICS_EVENTS.ANALYSIS_FAILED);
  else if (state === "cancelled") trackEvent(ANALYTICS_EVENTS.ANALYSIS_CANCELLED);
}

interface UseAnalysisSessionResult {
  view: AnalysisSessionView | null;
  status: "idle" | "starting" | "polling" | "error";
  error: UserFacingError | null;
  start: (startupIdea: string, title?: string) => Promise<void>;
  cancel: () => Promise<void>;
  retry: () => Promise<void>;
}

// Replaces useAnalyzeStartup for the live flow (MILESTONE_14_DESIGN.md
// Sections 4/7/22). Polls GET /api/analysis-sessions/:id on a fixed
// interval while the session is non-terminal — the simplest mechanism
// that satisfies real progress visibility; streaming is a deliberately
// separate, not-yet-scheduled concern (Section 22 / CLAUDE.md's own
// Performance Rules).
export function useAnalysisSession(): UseAnalysisSessionResult {
  const view = useSessionStore((s) => s.view);
  const status = useSessionStore((s) => s.status);
  const error = useSessionStore((s) => s.error);
  const sessionId = useSessionStore((s) => s.sessionId);

  const setSessionId = useSessionStore((s) => s.setSessionId);
  const setView = useSessionStore((s) => s.setView);
  const setStatus = useSessionStore((s) => s.setStatus);
  const setError = useSessionStore((s) => s.setError);
  const reset = useSessionStore((s) => s.reset);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Unmount-only cleanup — clearTimer's identity is stable (empty dep
  // array), so this effect runs once and its cleanup fires on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  const parseView = useCallback((data: unknown): AnalysisSessionView => {
    return parseOrThrow(
      AnalysisSessionViewSchema,
      data,
      "Received an unexpected response from the analysis session API."
    );
  }, []);

  // `poll` schedules its own next call recursively. Referencing `poll`
  // by its own const name from inside its useCallback body is a
  // temporal-dead-zone/self-reference anti-pattern the react-hooks lint
  // rule correctly rejects — the recursive call instead goes through
  // `pollRef`, kept in sync via an effect (never mutated during render,
  // matching this codebase's established ref+effect convention — see
  // useAnalyzeStartup.ts).
  const pollRef = useRef<(id: string) => Promise<void>>(async () => {});

  const poll = useCallback(
    async (id: string) => {
      try {
        const data = await getJSON<unknown>(`/api/analysis-sessions/${id}`);
        const parsed = parseView(data);
        setView(parsed);

        if (isTerminalSessionState(parsed.session.state)) {
          trackTerminalState(parsed.session.state);
        } else {
          timerRef.current = setTimeout(() => pollRef.current(id), POLL_INTERVAL_MS);
        }
      } catch (err) {
        setStatus("error");
        setError(describeError(err));
      }
    },
    [parseView, setView, setStatus, setError]
  );

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const start = useCallback(
    async (startupIdea: string, title?: string) => {
      if (!startupIdea.trim()) return;

      clearTimer();
      reset();
      setStatus("starting");

      try {
        const data = await postJSON<unknown>("/api/analysis-sessions", { startupIdea, title });
        const parsed = parseView(data);

        // Fires as soon as the request succeeds, regardless of what the
        // session's own first observed state is — "did the founder
        // successfully submit an idea" is the meaningful event, distinct
        // from whatever happens to it next.
        trackEvent(ANALYTICS_EVENTS.ANALYSIS_STARTED);

        setSessionId(parsed.session.id);
        setView(parsed);
        setStatus("polling");

        if (isTerminalSessionState(parsed.session.state)) {
          trackTerminalState(parsed.session.state);
        } else {
          timerRef.current = setTimeout(() => poll(parsed.session.id), POLL_INTERVAL_MS);
        }
      } catch (err) {
        setStatus("error");
        setError(describeError(err));
      }
    },
    [clearTimer, reset, parseView, poll, setSessionId, setView, setStatus, setError]
  );

  const cancel = useCallback(async () => {
    if (!sessionId) return;
    clearTimer();

    try {
      const data = await postJSON<unknown>(`/api/analysis-sessions/${sessionId}/cancel`);
      const parsed = parseView(data);
      setView(parsed);

      if (isTerminalSessionState(parsed.session.state)) {
        trackTerminalState(parsed.session.state);
      } else {
        timerRef.current = setTimeout(() => poll(sessionId), POLL_INTERVAL_MS);
      }
    } catch (err) {
      setStatus("error");
      setError(describeError(err));
    }
  }, [sessionId, clearTimer, parseView, poll, setView, setStatus, setError]);

  const retry = useCallback(async () => {
    if (!sessionId) return;
    clearTimer();
    setStatus("polling");

    try {
      const data = await postJSON<unknown>(`/api/analysis-sessions/${sessionId}/retry`);
      const parsed = parseView(data);
      setView(parsed);

      if (!isTerminalSessionState(parsed.session.state)) {
        timerRef.current = setTimeout(() => poll(sessionId), POLL_INTERVAL_MS);
      }
    } catch (err) {
      setStatus("error");
      setError(describeError(err));
    }
  }, [sessionId, clearTimer, parseView, poll, setView, setStatus, setError]);

  return { view, status, error, start, cancel, retry };
}
