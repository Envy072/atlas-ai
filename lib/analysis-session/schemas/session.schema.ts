import { z } from "zod";
import { PipelineContextSchema, ProgressSnapshotSchema } from "@/lib/pipeline";
import { SessionStateSchema } from "@/lib/analysis-session/schemas/enums";
import { TimelineEntrySchema } from "@/lib/analysis-session/schemas/timeline.schema";

// Reuses the exact `decision` field schema PipelineContextSchema already
// validates (`DecisionSynthesisResultSchema.optional()`, one layer
// down) via Zod's own `.shape` accessor — never importing lib/decision
// directly. This is what "consume only the public API of lib/pipeline"
// means concretely for a field this layer needs but doesn't own: the
// shape is reused, sourced entirely from lib/pipeline's own public
// PipelineContextSchema export.
const SessionResultSchema = PipelineContextSchema.shape.decision;

// The lightweight record this layer actually persists — deliberately
// small. Everything else about a session (state, progress, timeline,
// result) is derived at read time from the PipelineExecution this
// record references, never stored a second time (MILESTONE_12_DESIGN.md
// Section 10's "derived, not duplicated" rule).
export const SessionRecordSchema = z.object({
  id: z.string(),
  executionId: z.string(),
  title: z.string().min(1),
  startupIdea: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SessionRecord = z.infer<typeof SessionRecordSchema>;

// The full, composed, user-facing view every public lifecycle function
// returns — built fresh on every read from a SessionRecord plus the
// PipelineExecution it references (see lifecycle/sessionComposer.ts).
// `progress` is Pipeline's own ProgressSnapshot, reused verbatim and
// unchanged — no second progress calculation exists at this layer (see
// progress/formatProgress.ts for the separate, non-schema friendly-label
// presentation built on top of it).
export const AnalysisSessionSchema = z.object({
  id: z.string(),
  executionId: z.string(),
  title: z.string().min(1),
  startupIdea: z.string().min(1),
  state: SessionStateSchema,
  progress: ProgressSnapshotSchema,
  timeline: z.array(TimelineEntrySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  result: SessionResultSchema,
});

export type AnalysisSession = z.infer<typeof AnalysisSessionSchema>;

export const CreateSessionInputSchema = z.object({
  startupIdea: z.string().min(1),
  title: z.string().min(1).optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;
