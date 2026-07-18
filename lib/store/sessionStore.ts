import { create } from "zustand";
import type { AnalysisSessionView } from "@/lib/schemas/analysisSessionView";
import type { UserFacingError } from "@/lib/errors/messages";

export type SessionStatus = "idle" | "starting" | "polling" | "error";

interface SessionStore {
  sessionId: string | null;
  view: AnalysisSessionView | null;
  status: SessionStatus;
  // A structured { title, description } (Milestone 45's describeError())
  // rather than a bare string — lets the UI show a real headline
  // distinct from the explanation, instead of one undifferentiated
  // sentence.
  error: UserFacingError | null;

  setSessionId: (sessionId: string | null) => void;
  setView: (view: AnalysisSessionView) => void;
  setStatus: (status: SessionStatus) => void;
  setError: (error: UserFacingError | null) => void;
  reset: () => void;
}

// Shared across SessionProgressExperience and DecisionReport's panels
// (siblings under AIWorkspace with no direct parent-child relationship
// carrying the data) — MILESTONE_14_DESIGN.md Section 22's justification
// for one new store, not a reflexive default.
export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  view: null,
  status: "idle",
  error: null,

  setSessionId: (sessionId) => set({ sessionId }),
  setView: (view) => set({ view }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),

  reset: () =>
    set({
      sessionId: null,
      view: null,
      status: "idle",
      error: null,
    }),
}));
