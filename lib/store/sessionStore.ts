import { create } from "zustand";
import type { AnalysisSessionView } from "@/lib/schemas/analysisSessionView";

export type SessionStatus = "idle" | "starting" | "polling" | "error";

interface SessionStore {
  sessionId: string | null;
  view: AnalysisSessionView | null;
  status: SessionStatus;
  error: string | null;

  setSessionId: (sessionId: string | null) => void;
  setView: (view: AnalysisSessionView) => void;
  setStatus: (status: SessionStatus) => void;
  setError: (error: string | null) => void;
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
