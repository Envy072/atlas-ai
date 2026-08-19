import type {
  DecisionTiming,
  ExecutionTimings,
  ProviderTimingRecord,
  StageTiming,
} from "@/lib/shared/timingSchema";

// Milestone 127 — a tiny in-process store, scoped per executionId, the
// same "Map-based, no external broker" pattern
// lib/pipeline/events/eventEmitter.ts already uses for the identical
// reason (Milestone 11's own precedent: one process, no shared state
// needed across instances for a value that's read back within the same
// request). Holds one execution's own in-flight timing measurements
// until finishTimings() reads and clears them for persistence into that
// execution's own PipelineContext.debug field
// (lib/pipeline/engine/pipelineEngine.ts's attachTimingsToContext). Lives
// in lib/shared, not lib/pipeline, for the same reason
// executionContext.ts/timingSchema.ts do — see either file's own comment.
interface CollectorEntry {
  startedAt: number;
  stages: Record<string, StageTiming>;
  providers: ProviderTimingRecord[];
  decision: DecisionTiming;
}

const collectorsByExecution = new Map<string, CollectorEntry>();

function getOrCreateEntry(executionId: string): CollectorEntry {
  let entry = collectorsByExecution.get(executionId);
  if (!entry) {
    entry = { startedAt: Date.now(), stages: {}, providers: [], decision: {} };
    collectorsByExecution.set(executionId, entry);
  }
  return entry;
}

// Called once per stage attempt, immediately before that attempt's own
// work begins — overwritten on a retry, so `stages[stage].startedAt`
// always reflects the most recent attempt, matching what
// recordStageEnd() below pairs it with.
export function recordStageStart(executionId: string, stage: string, startedAtIso: string): void {
  getOrCreateEntry(executionId).stages[stage] = { startedAt: startedAtIso };
}

// Called only on a stage's successful attempt — an unresolved
// `stages[stage]` (startedAt with no finishedAt/durationMs) is itself
// meaningful: it identifies the stage that was in progress when the run
// failed or was cancelled.
export function recordStageEnd(
  executionId: string,
  stage: string,
  finishedAtIso: string,
  durationMs: number
): void {
  const entry = getOrCreateEntry(executionId);
  const existing = entry.stages[stage];
  entry.stages[stage] = {
    startedAt: existing?.startedAt ?? finishedAtIso,
    finishedAt: finishedAtIso,
    durationMs,
  };
}

// A no-op (never throws, never records) when called with no current
// executionId — e.g. a research call made from a unit test or any other
// caller outside the pipeline's own runWithExecutionId() wrapper
// (lib/shared/executionContext.ts). Instrumentation must never change
// behavior for a caller that isn't running inside a tracked execution.
export function recordProviderCall(executionId: string | undefined, record: ProviderTimingRecord): void {
  if (!executionId) return;
  getOrCreateEntry(executionId).providers.push(record);
}

export function recordDecisionTiming(
  executionId: string,
  phase: keyof DecisionTiming,
  durationMs: number
): void {
  getOrCreateEntry(executionId).decision[phase] = durationMs;
}

// Reads and clears this execution's own collected timings — called
// exactly once, at the point the whole pipeline reaches a terminal state
// (pipelineEngine.ts's runFromCurrentStage), so a completed/failed/
// cancelled run's measurements are attached to its own PipelineContext
// and this in-memory map doesn't accumulate indefinitely across
// unrelated future executions. Returns undefined if nothing was ever
// recorded for this executionId — a defensive default; in practice this
// never happens for a real run, since recordStageStart() fires before
// stage one's own work begins.
export function finishTimings(executionId: string): ExecutionTimings | undefined {
  const entry = collectorsByExecution.get(executionId);
  if (!entry) return undefined;
  collectorsByExecution.delete(executionId);

  return {
    totalMs: Date.now() - entry.startedAt,
    stages: entry.stages,
    providers: entry.providers,
    decision: entry.decision,
  };
}

// The non-destructive counterpart to finishTimings() — reads this
// execution's own current snapshot WITHOUT clearing it, so it can be
// called repeatedly across a run (pipelineEngine.ts's own per-stage
// checkpoint writes) and still reflect everything recorded so far,
// including whatever the NEXT stage still has to add. `totalMs` here is
// "elapsed so far," not a final total, when read before the run has
// actually finished — only finishTimings()'s own terminal call gives a
// true final duration. Returns undefined under the identical condition
// finishTimings() does.
export function peekTimings(executionId: string): ExecutionTimings | undefined {
  const entry = collectorsByExecution.get(executionId);
  if (!entry) return undefined;

  return {
    totalMs: Date.now() - entry.startedAt,
    stages: entry.stages,
    providers: entry.providers,
    decision: entry.decision,
  };
}
