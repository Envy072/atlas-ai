// Public entry point for the Analysis Session layer (Milestone 12).
// Every future dashboard consumer should import from here, never from a
// deep path into a specific subfolder — the same discipline every prior
// platform's public barrel enforces for itself.
export {
  createSession,
  getSession,
  listSessions,
  cancelSession,
  retrySession,
  resumeSession,
  getLogs,
} from "@/lib/analysis-session/lifecycle/sessionLifecycle";
export { subscribeToSession } from "@/lib/analysis-session/events/sessionEventEmitter";

export { projectSessionState } from "@/lib/analysis-session/state/projectSessionState";
export { buildTimeline, STAGE_ORDER } from "@/lib/analysis-session/timeline/buildTimeline";
export { buildLogs } from "@/lib/analysis-session/logs/buildLogs";
export { formatProgress } from "@/lib/analysis-session/progress/formatProgress";

export { createStore } from "@/lib/analysis-session/storage/createStore";
export { MemoryAnalysisSessionStore } from "@/lib/analysis-session/storage/memoryStore";

export * from "@/lib/analysis-session/schemas";
export * from "@/lib/analysis-session/types";
