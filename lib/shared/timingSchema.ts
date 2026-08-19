import { z } from "zod";

// Milestone 127 — Production Launch Configuration, timeout investigation.
// The shape of one pipeline execution's own runtime measurements. Lives
// in lib/shared (not lib/pipeline, where this data conceptually
// originates) specifically because two platforms on opposite sides of
// this codebase's own strict dependency DAG both need to touch it:
// lib/research/manager/providerManager.ts WRITES a record per provider
// call, and lib/pipeline/engine/pipelineEngine.ts READS the accumulated
// result — research must never import from pipeline (a hard,
// zero-exception boundary this codebase has held since its first
// platform, confirmed via ARCHITECTURE_REVIEW.md Check 1), so this
// shape and its collector (executionContext.ts, timingCollector.ts,
// same folder) live one level below both, exactly what lib/shared exists
// for. Attached to PipelineContext as an optional `debug` field (see
// lib/pipeline/schemas/context.schema.ts) so it flows through the
// existing checkpoint/compose/API-response path with no new storage or
// transport mechanism.

// One real attempt against one research provider (Tavily/Brave/
// Crunchbase). `operation` is always "search" today — the only method
// ResearchProvider exposes (lib/research/types/provider.ts) — kept as
// its own field rather than hardcoded at the read site so a future
// provider capability doesn't require a schema change here.
export const ProviderTimingRecordSchema = z.object({
  provider: z.string(),
  operation: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number(),
  success: z.boolean(),
  retryCount: z.number().int().nonnegative(),
});

export type ProviderTimingRecord = z.infer<typeof ProviderTimingRecordSchema>;

// One entry per pipeline stage that reached at least one attempt during
// this execution. `finishedAt`/`durationMs` stay absent for a stage that
// started but never reached a successful attempt (the run failed or was
// cancelled mid-stage) — an honest partial measurement, never discarded,
// never backfilled with a fabricated value.
export const StageTimingSchema = z.object({
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  durationMs: z.number().optional(),
});

export type StageTiming = z.infer<typeof StageTimingSchema>;

// The decision stage's own internal breakdown — every field optional
// since a run that fails partway through this stage (e.g. the fan-out
// itself throws) never reaches the later ones. `fanoutMs` is the overall
// Promise.all duration (bounded by its slowest branch); the five
// `*Ms` fields beside it are each branch's own individual duration,
// measured concurrently with each other via the exact same Promise.all
// this stage always ran — timing wraps each branch, it does not change
// when or how any of them are invoked.
export const DecisionTimingSchema = z.object({
  fanoutMs: z.number().optional(),
  researchMs: z.number().optional(),
  competitorsMs: z.number().optional(),
  marketMs: z.number().optional(),
  financialMs: z.number().optional(),
  businessMs: z.number().optional(),
  findingsMs: z.number().optional(),
  risksMs: z.number().optional(),
  thesisMs: z.number().optional(),
});

export type DecisionTiming = z.infer<typeof DecisionTimingSchema>;

// `stages` is keyed by stage name as a plain string (not an enum schema)
// — an enum-keyed z.record in this Zod version treats every enum value
// as required, which would wrongly demand all six stages be present even
// for a run that failed at stage two.
export const ExecutionTimingsSchema = z.object({
  totalMs: z.number().optional(),
  stages: z.record(z.string(), StageTimingSchema),
  providers: z.array(ProviderTimingRecordSchema),
  decision: DecisionTimingSchema,
});

export type ExecutionTimings = z.infer<typeof ExecutionTimingsSchema>;

export const DebugInfoSchema = z.object({
  timings: ExecutionTimingsSchema,
});

export type DebugInfo = z.infer<typeof DebugInfoSchema>;
