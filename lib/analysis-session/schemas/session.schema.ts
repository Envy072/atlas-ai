import { z } from "zod";
// Milestone 127 — imported from their specific schema files, not
// lib/pipeline's full public barrel as this file's own pre-existing
// comment below still describes in spirit: that barrel now also
// re-exports pipelineEngine.ts's startPipeline() etc., which imports
// lib/shared's AsyncLocalStorage-based execution-context helper (needs
// the Node-only node:async_hooks). This schema file is reachable from
// hooks/useAnalysisSession.ts (a Client Component, re-validating a
// polled response) via lib/schemas/analysisSessionView.ts — a bundler
// resolving the whole lib/pipeline barrel to reach these two schemas
// hits that dependency even though pipelineEngine.ts's own functions are
// never called client-side. Both target files are confirmed
// dependency-free of pipelineEngine.ts itself (verified by reading each
// directly, not assumed).
import { PipelineContextSchema } from "@/lib/pipeline/schemas/context.schema";
import { ProgressSnapshotSchema } from "@/lib/pipeline/schemas/progress.schema";
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

// Milestone 127 — the identical reuse pattern as SessionResultSchema
// above, one field over: PipelineContextSchema's own `debug` field
// (runtime timing measurements, defined in lib/shared since both
// lib/research and lib/pipeline need to touch it — see
// lib/shared/timingSchema.ts's own comment) is reused verbatim, never
// redefined here.
const SessionDebugSchema = PipelineContextSchema.shape.debug;

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
  // The signed-in user who started this session, or null for an
  // anonymous one (Milestone 47). Internal to this record only — never
  // added to AnalysisSessionSchema below, since ownership is an
  // enforcement detail the client-facing view has no reason to see.
  ownerId: z.string().nullable(),
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
  debug: SessionDebugSchema,
});

export type AnalysisSession = z.infer<typeof AnalysisSessionSchema>;

// Length ceilings (Milestone 102), each sized to the field's own real
// purpose rather than picked arbitrarily:
//
// startupIdea: the product's own stated shape for this field is "a
// founder describes an idea in a few sentences" (CLAUDE.md's Project
// Vision) — a short pitch, not a document. 2000 characters is several
// times more than a thorough few-paragraph pitch needs, while still
// bounding the real cost driver: this raw string is embedded, unchanged,
// into every one of the ~5 sequential OpenAI prompts the real pipeline
// issues per analysis (lib/services/openai.ts's five generation
// exports), so its length is a cost *multiplier* across the whole
// pipeline, not a one-off charge. A caller within the existing rate
// limit could otherwise submit an unbounded string and multiply the
// resulting token cost by the same factor on every call. 2000 also
// matches this codebase's one other free-text input ceiling
// (analysisFlag.ts's description field) — reusing an established,
// already-reasoned bound instead of inventing a second number for the
// same kind of decision keeps future schema additions predictable.
//
// title: an optional, cosmetic display label only (session history,
// project lists) — never sent to OpenAI, so it carries no AI-cost risk.
// 200 characters comfortably exceeds any real short label (a few words
// to one sentence) while still preventing an oversized value from
// breaking the fixed-width layouts that render it, and closes the same
// "unbounded string field" pattern on general defensive-validation
// grounds even where cost isn't the driving concern.
export const CreateSessionInputSchema = z.object({
  startupIdea: z.string().min(1).max(2000),
  title: z.string().min(1).max(200).optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;
