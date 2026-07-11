import { z } from "zod";

// The eight session states — a friendlier vocabulary mapped 1:1 from
// lib/pipeline's own PipelineState (MILESTONE_12_DESIGN.md Section 5).
// Never a reinterpretation of Pipeline's state machine, only a relabeling
// of it — see state/projectSessionState.ts for the lookup table.
export const SessionStateSchema = z.enum([
  "starting",
  "analyzing",
  "waiting_retry",
  "needs_attention",
  "cancelling",
  "completed",
  "cancelled",
  "failed",
]);

export type SessionState = z.infer<typeof SessionStateSchema>;

// The kinds of entries the curated Timeline (Section 6) is built from.
export const TimelineEntryKindSchema = z.enum([
  "session_started",
  "stage_started",
  "stage_completed",
  "stage_needs_attention",
  "session_cancelled",
  "session_completed",
  "session_failed",
]);

export type TimelineEntryKind = z.infer<typeof TimelineEntryKindSchema>;

// The three severities a verbose Log entry (Section 9) can carry.
export const LogLevelSchema = z.enum(["info", "warn", "error"]);

export type LogLevel = z.infer<typeof LogLevelSchema>;

// The event vocabulary from Section 8 — a translated view of
// lib/pipeline's own PipelineEventType, in Session's own words.
export const SessionEventTypeSchema = z.enum([
  "session.started",
  "timeline.updated",
  "session.needs_attention",
  "session.cancelling",
  "session.cancelled",
  "session.completed",
  "session.failed",
]);

export type SessionEventType = z.infer<typeof SessionEventTypeSchema>;
