import { InvalidRequestError, ConcurrencyConflictError, getErrorMessage } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";
import type { PipelineContext } from "@/lib/pipeline/schemas/context.schema";
import type { StageRecord } from "@/lib/pipeline/schemas/stage.schema";
import type { PipelineState, StageTrigger } from "@/lib/pipeline/schemas/enums";
import type { PipelineExecution, StartPipelineInput } from "@/lib/pipeline/schemas/execution.schema";
import { StartPipelineInputSchema } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";
import type { PipelineStageDefinition } from "@/lib/pipeline/types/stage";
import { buildInitialExecution } from "@/lib/pipeline/engine/executionFactory";
import { assertTransition, isTerminalState } from "@/lib/pipeline/state/stateMachine";
import { computeProgress, TOTAL_STAGES } from "@/lib/pipeline/progress/progressCalculator";
import {
  DEFAULT_PIPELINE_RETRY_POLICY,
  computeBackoffMs,
  countAutoRetries,
  nextAttemptNumber,
} from "@/lib/pipeline/retry";
import { emitPipelineEvent, subscribeToExecution } from "@/lib/pipeline/events/eventEmitter";
import { writeCheckpoint, CheckpointConflictError } from "@/lib/pipeline/checkpoint/checkpointWriter";
import { createStore } from "@/lib/pipeline/storage/createStore";
import {
  researchStage,
  competitorsStage,
  marketStage,
  financialStage,
  businessStage,
  decisionStage,
} from "@/lib/pipeline/stages";

// The one default store this whole engine operates against unless a
// caller supplies its own. Explicitly requests "supabase" (Milestone
// 107) rather than relying on createStore()'s own "memory" default —
// that default stays unchanged for any other caller (e.g. this engine's
// own tests, which construct a MemoryPipelineStore directly and never
// touch this binding) so it keeps meaning "an in-memory store"
// everywhere else. Safe to construct eagerly here, unlike the mistake
// Milestone 106 first made and then fixed: createSupabasePipelineStore()
// only builds closures and defers its own real Supabase client
// construction until a method is actually called (see its own comment),
// so importing this module never touches live credentials by itself.
const defaultStore: PipelineExecutionStore = createStore({ backend: "supabase" });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transitionTo(execution: PipelineExecution, state: PipelineState, now: Date = new Date()): PipelineExecution {
  assertTransition(execution.state, state);
  return { ...execution, state, updatedAt: now.toISOString() };
}

// Replaces the old re-fetch-then-blindly-preserve-state approach
// (Milestone 104A ADR / Milestone 107's approved concurrency design):
// that pattern only "worked" because an in-memory store never yields to
// the event loop between its own read and write, making the gap a
// cancelPipeline() call could land in vanishingly small. A real,
// network-latency-backed store (Milestone 107) makes that same gap
// genuinely exploitable — the underlying schema.upsertWithVersionCheck
// call inside writeCheckpoint() is what actually closes it, by refusing
// to persist a stale version at all rather than hoping nothing landed
// in between.
//
// On a version conflict, this function reconciles by yielding to a
// concurrently-committed cancellation rather than retrying its own
// original transition — a stage that was already in flight when
// cancelPipeline() landed must observe "cancelling"/"cancelled" and stop,
// never overwrite it (Milestone 107's approved design, "Cancellation
// Semantics"). No other legitimate concurrent writer exists in this
// design; a conflict explained by anything else is a genuine,
// unexpected invariant violation and propagates uncaught, matching this
// module's own established precedent for a schema-validation failure.
async function writeCheckpointYieldingToCancellation(
  store: PipelineExecutionStore,
  execution: PipelineExecution
): Promise<PipelineExecution> {
  try {
    return await writeCheckpoint(store, execution);
  } catch (error) {
    if (!(error instanceof CheckpointConflictError)) throw error;

    const { current } = error;
    if (current.state === "cancelled") return current;
    if (current.state === "cancelling") {
      // Preserve this call's OWN update (e.g. a stage's own successful
      // result, already applied to `execution` in memory) rather than
      // discarding it in favor of the fresh row's — a stage that
      // completed successfully keeps its own history even though the
      // pipeline is ending in "cancelled", exactly as it would have if
      // cancellation had never raced it. Only `state` and `version` come
      // from the fresh row, since those are what the conflict actually
      // revealed; everything else is this call's own already-computed
      // result.
      const reconciled = { ...execution, state: current.state, version: current.version };
      return writeCheckpoint(store, transitionTo(reconciled, "cancelled", new Date()));
    }
    // Milestone 108: a concurrent caller already achieved the exact
    // transition this call wanted (e.g. two staleness-triggered recovery
    // attempts both racing to mark the same stuck execution "running"
    // again) — not a conflict to escalate, since the goal this call
    // wanted is already true. This is what makes duplicate recovery
    // attempts suppress cleanly rather than error.
    if (current.state === execution.state) return current;

    throw error;
  }
}

const MAX_CANCEL_CONFLICT_RETRIES = 3;

// stage_failed/retry_pending cancel immediately; any other (non-terminal)
// state means a stage is genuinely in flight, so cancellation is a
// two-phase "mark cancelling, let the running loop observe it" instead —
// exactly cancelPipeline()'s own pre-existing branching, now factored out
// so it can be recomputed on every retry attempt below (never fixed
// upfront), since a conflict can itself change which of the two paths is
// now correct.
function cancelTargetState(state: PipelineState): "cancelled" | "cancelling" {
  return state === "stage_failed" || state === "retry_pending" ? "cancelled" : "cancelling";
}

// Unlike writeCheckpointYieldingToCancellation above, cancelPipeline()'s
// own write must never yield to anything — a user-requested cancellation
// should always eventually take effect while the execution hasn't
// already finished (Milestone 107's approved design, "Cancellation
// Semantics" + "Retry Strategy"). On a version conflict, re-fetch and
// retry the same logical intent (cancel) against the fresh state —
// re-deriving the correct target via cancelTargetState each time, since
// the conflict itself may have changed which path applies — bounded, and
// short-circuiting early if the execution has already reached a
// terminal state (nothing left to cancel).
async function cancelWithRetry(store: PipelineExecutionStore, checkpoint: PipelineExecution): Promise<PipelineExecution> {
  let current = checkpoint;

  for (let attempt = 0; attempt < MAX_CANCEL_CONFLICT_RETRIES; attempt++) {
    if (isTerminalState(current.state)) return current;

    try {
      const transitioned = transitionTo(current, cancelTargetState(current.state), new Date());
      return await writeCheckpoint(store, transitioned);
    } catch (error) {
      if (!(error instanceof CheckpointConflictError)) throw error;
      current = error.current;
    }
  }

  throw new ConcurrencyConflictError(
    `Could not cancel execution "${checkpoint.id}" after ${MAX_CANCEL_CONFLICT_RETRIES} conflicting attempts.`
  );
}

// Runs one stage to completion, retrying automatically per `policy` on
// failure, and checkpointing after every attempt. The try/catch below is
// scoped to exactly one thing — `stage.run()`'s own promise — so a
// genuine internal bug (e.g. this engine's own checkpoint schema failing
// to validate) is never caught here and misclassified as a retryable
// stage failure (Section 12); it propagates as a real, uncaught error.
async function executeStageWithRetry<TResult>(
  execution: PipelineExecution,
  stage: PipelineStageDefinition<TResult>,
  applyResult: (context: PipelineContext, result: TResult) => PipelineContext,
  store: PipelineExecutionStore,
  initialTrigger: StageTrigger
): Promise<PipelineExecution> {
  const policy = DEFAULT_PIPELINE_RETRY_POLICY;
  let current = execution;
  let trigger: StageTrigger = initialTrigger;

  for (;;) {
    const attempt = nextAttemptNumber(current.stageHistory, stage.name);
    const startedAt = new Date();

    emitPipelineEvent({
      type: "stage.started",
      executionId: current.id,
      timestamp: startedAt.toISOString(),
      stage: stage.name,
      attempt,
    });

    let result: TResult;
    try {
      // Milestone 116 — current.id (this execution's own id) is passed
      // to every stage so decisionStage can scope market/competitor
      // knowledge resolution to this one analysis; the other five
      // stages simply don't declare a second parameter and ignore it.
      result = await stage.run(current.startupIdea, current.id);
    } catch (error) {
      const failedAt = new Date();
      const message = getErrorMessage(error);
      const failedRecord: StageRecord = {
        stage: stage.name,
        attempt,
        trigger,
        status: "failed",
        startedAt: startedAt.toISOString(),
        finishedAt: failedAt.toISOString(),
        errorMessage: message,
      };
      const historyWithFailure = [...current.stageHistory, failedRecord];
      const autoRetriesSoFar = countAutoRetries(historyWithFailure, stage.name);

      if (autoRetriesSoFar < policy.maxAutoRetries) {
        current = transitionTo(
          { ...current, stageHistory: historyWithFailure, progress: computeProgress(historyWithFailure) },
          "retry_pending",
          failedAt
        );
        emitPipelineEvent({
          type: "stage.retry_scheduled",
          executionId: current.id,
          timestamp: current.updatedAt,
          stage: stage.name,
          attempt,
          message,
        });
        current = await writeCheckpointYieldingToCancellation(store, current);
        if (current.state === "cancelled") return current;

        await sleep(computeBackoffMs(policy, autoRetriesSoFar + 1));

        // A concurrent cancelPipeline() call may have landed while we
        // were waiting — cooperative cancellation applies during backoff
        // too, not only between the six major stages.
        const afterBackoff = await store.getById(current.id);
        if (afterBackoff && afterBackoff.state === "cancelled") {
          return afterBackoff;
        }

        current = transitionTo(current, "running", new Date());
        // Persisted immediately, like every other transition in this
        // function — otherwise the store's last real write stays
        // "retry_pending" through the next attempt, and a subsequent
        // successful attempt's own checkpoint could conflict against a
        // version this loop itself never advanced.
        current = await writeCheckpointYieldingToCancellation(store, current);
        if (current.state === "cancelled") return current;
        trigger = "auto_retry";
        continue;
      }

      current = transitionTo(
        {
          ...current,
          stageHistory: historyWithFailure,
          progress: computeProgress(historyWithFailure),
          errorSummary: message,
        },
        "stage_failed",
        failedAt
      );
      emitPipelineEvent({
        type: "stage.failed",
        executionId: current.id,
        timestamp: current.updatedAt,
        stage: stage.name,
        attempt,
        message,
      });
      current = await writeCheckpointYieldingToCancellation(store, current);
      return current;
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const succeededRecord: StageRecord = {
      stage: stage.name,
      attempt,
      trigger,
      status: "succeeded",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
    };
    const historyWithSuccess = [...current.stageHistory, succeededRecord];

    current = {
      ...current,
      context: applyResult(current.context, result),
      stageHistory: historyWithSuccess,
      progress: computeProgress(historyWithSuccess),
      updatedAt: finishedAt.toISOString(),
    };

    emitPipelineEvent({
      type: "stage.completed",
      executionId: current.id,
      timestamp: current.updatedAt,
      stage: stage.name,
      attempt,
    });
    current = await writeCheckpointYieldingToCancellation(store, current);
    return current;
  }
}

// Dispatches to exactly one of the six stages by index — an explicit
// switch rather than a generic loop over a mixed-result-type array, so
// each stage's result is applied into the Pipeline Context with full
// type safety and no `any`/`unknown` widening (Section 14).
async function runOneStage(
  index: number,
  execution: PipelineExecution,
  store: PipelineExecutionStore,
  initialTrigger: StageTrigger
): Promise<PipelineExecution> {
  switch (index) {
    case 0:
      return executeStageWithRetry(
        execution,
        researchStage,
        (context, result) => ({ ...context, research: result }),
        store,
        initialTrigger
      );
    case 1:
      return executeStageWithRetry(
        execution,
        competitorsStage,
        (context, result) => ({ ...context, competitors: result }),
        store,
        initialTrigger
      );
    case 2:
      return executeStageWithRetry(
        execution,
        marketStage,
        (context, result) => ({ ...context, market: result }),
        store,
        initialTrigger
      );
    case 3:
      return executeStageWithRetry(
        execution,
        financialStage,
        (context, result) => ({ ...context, financial: result }),
        store,
        initialTrigger
      );
    case 4:
      return executeStageWithRetry(
        execution,
        businessStage,
        (context, result) => ({ ...context, business: result }),
        store,
        initialTrigger
      );
    case 5:
      return executeStageWithRetry(
        execution,
        decisionStage,
        (context, result) => ({ ...context, decision: result }),
        store,
        initialTrigger
      );
    default:
      throw new Error(`Invalid pipeline stage index: ${index}.`);
  }
}

// Drives the execution from wherever `currentStageIndex` says it should
// resume, through to `completed` — or until a stage lands in
// `stage_failed`, or cancellation is observed. Shared by startPipeline
// (fresh, index 0), resumePipeline (continues an interrupted stage), and
// retryStage (re-runs exactly the failed stage, then continues
// normally).
async function runFromCurrentStage(
  execution: PipelineExecution,
  store: PipelineExecutionStore,
  firstStageTrigger: StageTrigger
): Promise<PipelineExecution> {
  let current = execution;
  let trigger = firstStageTrigger;

  for (let index = current.currentStageIndex; index < TOTAL_STAGES; index++) {
    // Cooperative cancellation: checked at every stage boundary, reading
    // the LATEST persisted state rather than trusting in-memory `current`,
    // since a concurrent cancelPipeline() call writes directly to the
    // store (Section 9).
    const latest = await store.getById(current.id);
    if (latest && latest.state === "cancelling") {
      current = transitionTo(latest, "cancelled", new Date());
      emitPipelineEvent({ type: "pipeline.cancelled", executionId: current.id, timestamp: current.updatedAt });
      current = await writeCheckpointYieldingToCancellation(store, current);
      return current;
    }

    current = await runOneStage(index, current, store, trigger);
    trigger = "initial"; // only the first stage driven by this call uses the caller-supplied trigger

    if (current.state === "stage_failed" || current.state === "cancelled" || current.state === "failed") {
      return current;
    }

    current = { ...current, currentStageIndex: index + 1 };
  }

  current = transitionTo(current, "completed", new Date());
  emitPipelineEvent({ type: "pipeline.completed", executionId: current.id, timestamp: current.updatedAt });
  current = await writeCheckpointYieldingToCancellation(store, current);
  return current;
}

// The single entry point for a brand-new execution. Validates input
// exactly as every Phase 1 platform's own discovery request schema does,
// before any execution record — even `pending` — is ever created
// (Section 12's "invalid input caught before pending is even created").
export async function startPipeline(
  input: StartPipelineInput,
  store: PipelineExecutionStore = defaultStore
): Promise<PipelineExecution> {
  const validated = parseOrThrow(StartPipelineInputSchema, input, "Invalid pipeline input.");

  let execution = buildInitialExecution(validated.startupIdea);
  execution = await writeCheckpoint(store, execution);

  execution = transitionTo(execution, "running");
  emitPipelineEvent({ type: "pipeline.started", executionId: execution.id, timestamp: execution.updatedAt });
  execution = await writeCheckpoint(store, execution);

  return runFromCurrentStage(execution, store, "initial");
}

// Resumes an execution after interruption or a browser refresh (Section
// 10). Recovery/terminal states are returned as-is — resuming only means
// "load and display" for those; only `pending`/`running` (where we can't
// know if the in-flight stage truly finished) triggers a real
// re-attempt, safe because every stage is a pure read with no side
// effects on external state.
export async function resumePipeline(
  executionId: string,
  store: PipelineExecutionStore = defaultStore
): Promise<PipelineExecution> {
  const checkpoint = await store.getById(executionId);
  if (!checkpoint) {
    throw new InvalidRequestError(`No pipeline execution found for id "${executionId}".`);
  }

  if (isTerminalState(checkpoint.state)) return checkpoint;
  if (checkpoint.state === "retry_pending" || checkpoint.state === "stage_failed" || checkpoint.state === "cancelling") {
    return checkpoint;
  }

  let execution = transitionTo(checkpoint, "running");
  execution = await writeCheckpointYieldingToCancellation(store, execution);
  if (execution.state === "cancelled") return execution;
  return runFromCurrentStage(execution, store, "resumed");
}

// Re-runs ONLY the stage currently recorded as failed — never restarts
// the pipeline from stage 1, never re-runs an already-succeeded stage
// (Section 8's "cannot restart a single stage" fix).
export async function retryStage(
  executionId: string,
  store: PipelineExecutionStore = defaultStore
): Promise<PipelineExecution> {
  const checkpoint = await store.getById(executionId);
  if (!checkpoint) {
    throw new InvalidRequestError(`No pipeline execution found for id "${executionId}".`);
  }
  if (checkpoint.state !== "stage_failed") {
    throw new InvalidRequestError(
      `Cannot retry: execution "${executionId}" is in state "${checkpoint.state}", not "stage_failed".`
    );
  }

  let execution = transitionTo(checkpoint, "running");
  execution = await writeCheckpointYieldingToCancellation(store, execution);
  if (execution.state === "cancelled") return execution;
  return runFromCurrentStage(execution, store, "manual_retry");
}

// Cooperative, stage-boundary-scoped cancellation (Section 9) — never an
// instantaneous mid-stage abort, since none of the six platforms accept
// an AbortSignal today.
export async function cancelPipeline(
  executionId: string,
  store: PipelineExecutionStore = defaultStore
): Promise<PipelineExecution> {
  const checkpoint = await store.getById(executionId);
  if (!checkpoint) {
    throw new InvalidRequestError(`No pipeline execution found for id "${executionId}".`);
  }
  if (isTerminalState(checkpoint.state)) return checkpoint;

  // cancelTargetState decides "cancel immediately" (stage_failed/
  // retry_pending — no stage in flight) vs. "mark cancelling, let the
  // running loop or the backoff wait inside executeStageWithRetry
  // observe it" (any other, non-terminal state — a stage is genuinely in
  // flight) — cancelWithRetry re-derives this on every conflict-retry
  // attempt, never fixing it upfront, since a conflict can itself change
  // which path is now correct.
  const execution = await cancelWithRetry(store, checkpoint);

  emitPipelineEvent({
    type: execution.state === "cancelled" ? "pipeline.cancelled" : "pipeline.cancelling",
    executionId,
    timestamp: execution.updatedAt,
  });

  return execution;
}

export async function getExecution(
  executionId: string,
  store: PipelineExecutionStore = defaultStore
): Promise<PipelineExecution | null> {
  return store.getById(executionId);
}

// Milestone 108 — a generous, deliberately conservative threshold:
// several times larger than any single stage (or the whole six-stage
// pipeline) has been observed to take in this environment (real runs
// ranged roughly 15-85s end to end), so a genuinely still-progressing
// execution is never mistaken for abandoned. Read-time only — no
// background job or scheduler exists in this codebase, and none is
// introduced here (Milestone 104A ADR's own "defer a background reaper
// until scheduled infrastructure exists for other reasons" decision).
export const STALE_EXECUTION_THRESHOLD_MS = 120_000;

// `pending`/`running`/`cancelling` are eligible. `pending`/`running`
// are exactly the two states resumePipeline() itself already knows how
// to act on (it already returns retry_pending/stage_failed/terminal
// states as-is, unchanged by this milestone). `cancelling` is a real,
// distinct gap discovered during this milestone's own manual validation
// (not a pre-existing bug): resumePipeline()'s own pre-existing
// behavior deliberately returns a "cancelling" checkpoint as-is,
// trusting that whatever process is already running will notice and
// finalize it at its next stage boundary — an assumption that breaks
// exactly when that process is the one that disappeared (a cancellation
// requested against an execution whose driver has already died, or a
// recovery attempt that itself loses a race to a concurrent cancel,
// leaves nothing left to ever finalize it). finalizeStaleCancellation()
// below closes this without touching resumePipeline()'s own restriction.
// A process crashing mid-backoff-sleep (state: retry_pending) has the
// same class of problem but is explicitly left out of this milestone's
// scope — closing it would mean changing resumePipeline()'s own
// restriction for a state this design deliberately doesn't touch.
export function isExecutionStale(execution: PipelineExecution, now: Date = new Date()): boolean {
  if (execution.state !== "pending" && execution.state !== "running" && execution.state !== "cancelling") {
    return false;
  }
  const ageMs = now.getTime() - Date.parse(execution.updatedAt);
  return ageMs > STALE_EXECUTION_THRESHOLD_MS;
}

// Finalizes an execution stuck at "cancelling" with no live process left
// to observe it — completing the exact transition cancelPipeline()
// already intended, via the same transitionTo/writeCheckpoint machinery
// every other transition in this file uses. Never invoked for
// pending/running (resumePipeline() already owns those); only meaningful
// once isExecutionStale() has already confirmed this specific execution
// is stuck.
export async function finalizeStaleCancellation(
  executionId: string,
  store: PipelineExecutionStore = defaultStore
): Promise<PipelineExecution> {
  const checkpoint = await store.getById(executionId);
  if (!checkpoint) {
    throw new InvalidRequestError(`No pipeline execution found for id "${executionId}".`);
  }
  if (checkpoint.state !== "cancelling") return checkpoint;

  const cancelled = transitionTo(checkpoint, "cancelled", new Date());
  return writeCheckpointYieldingToCancellation(store, cancelled);
}

export { subscribeToExecution };
