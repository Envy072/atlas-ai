import { z } from "zod";

// The nine pipeline states from MILESTONE_11_DESIGN.md Section 6. Note
// "resuming" is deliberately absent — it is implemented as an
// instantaneous, computed pass-through inside resumePipeline() (read the
// checkpoint, decide what to do, act) rather than a state that is ever
// itself persisted; see PIPELINE.md's State Machine section for why.
export const PipelineStateSchema = z.enum([
  "pending",
  "running",
  "retry_pending",
  "stage_failed",
  "cancelling",
  "completed",
  "cancelled",
  "failed",
]);

export type PipelineState = z.infer<typeof PipelineStateSchema>;

// The six stages, in execution order (Section 5). Every stage wraps
// exactly one platform's own public entry point.
export const StageNameSchema = z.enum([
  "research",
  "competitors",
  "market",
  "financial",
  "business",
  "decision",
]);

export type StageName = z.infer<typeof StageNameSchema>;

export const StageStatusSchema = z.enum(["running", "succeeded", "failed"]);

export type StageStatus = z.infer<typeof StageStatusSchema>;

// What caused a given stage attempt to run — lets retry counts (Section 8)
// be derived honestly from history instead of tracked as separate
// counters that could drift from the record of what actually happened.
export const StageTriggerSchema = z.enum([
  "initial",
  "auto_retry",
  "manual_retry",
  "resumed",
]);

export type StageTrigger = z.infer<typeof StageTriggerSchema>;

// The event vocabulary from Section 11.
export const PipelineEventTypeSchema = z.enum([
  "pipeline.started",
  "stage.started",
  "stage.completed",
  "stage.failed",
  "stage.retry_scheduled",
  "pipeline.cancelling",
  "pipeline.cancelled",
  "pipeline.completed",
  "pipeline.failed",
]);

export type PipelineEventType = z.infer<typeof PipelineEventTypeSchema>;
