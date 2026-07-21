import { InvalidRequestError, getErrorMessage } from "@/lib/errors";
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
import { writeCheckpoint } from "@/lib/pipeline/checkpoint/checkpointWriter";
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
// caller supplies its own (e.g. a future Supabase-backed one) — the same
// zero-config default every Phase 1 platform's own createStore() offers,
// but held here as a live instance because, unlike a knowledge platform,
// this engine's own responsibility (Section 3) includes persisting its
// own execution state automatically after every transition, not leaving
// persistence to the caller.
const defaultStore: PipelineExecutionStore = createStore();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transitionTo(execution: PipelineExecution, state: PipelineState, now: Date = new Date()): PipelineExecution {
  assertTransition(execution.state, state);
  return { ...execution, state, updatedAt: now.toISOString() };
}

// Re-fetches the persisted state before a checkpoint write that would
// otherwise blindly carry forward an in-memory `state` value — this is
// what stops a stage that was already in flight when cancelPipeline()
// landed from clobbering "cancelling" back to "running" once it finishes
// (MILESTONE_11_DESIGN.md Section 9's cooperative cancellation only
// works if a concurrently-requested cancellation can never be silently
// overwritten by the stage that was already running when it was
// requested).
async function checkpointPreservingConcurrentState(
  store: PipelineExecutionStore,
  execution: PipelineExecution
): Promise<PipelineExecution> {
  const latest = await store.getById(execution.id);
  const preserved = latest ? { ...execution, state: latest.state } : execution;
  return writeCheckpoint(store, preserved);
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
      result = await stage.run(current.startupIdea);
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
        current = await writeCheckpoint(store, current);

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
        // "retry_pending" through the next attempt, and
        // checkpointPreservingConcurrentState (which trusts the store as
        // the source of truth for exactly this reason) would silently
        // revert a subsequent successful attempt's state back to
        // "retry_pending", corrupting it.
        current = await writeCheckpoint(store, current);
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
      current = await writeCheckpoint(store, current);
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
    current = await checkpointPreservingConcurrentState(store, current);
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
      current = await writeCheckpoint(store, current);
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
  current = await writeCheckpoint(store, current);
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
  execution = await writeCheckpoint(store, execution);
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
  execution = await writeCheckpoint(store, execution);
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

  if (checkpoint.state === "stage_failed" || checkpoint.state === "retry_pending") {
    // No stage is actually in flight right now (just a scheduled retry
    // or a paused failure) — cancel immediately.
    let execution = transitionTo(checkpoint, "cancelled");
    emitPipelineEvent({ type: "pipeline.cancelled", executionId, timestamp: execution.updatedAt });
    execution = await writeCheckpoint(store, execution);
    return execution;
  }

  // state is "running" — a stage is genuinely in flight; mark
  // "cancelling" and let the running loop (or the backoff wait inside
  // executeStageWithRetry) observe it at the next opportunity.
  let execution = transitionTo(checkpoint, "cancelling");
  emitPipelineEvent({ type: "pipeline.cancelling", executionId, timestamp: execution.updatedAt });
  execution = await writeCheckpoint(store, execution);
  return execution;
}

export async function getExecution(
  executionId: string,
  store: PipelineExecutionStore = defaultStore
): Promise<PipelineExecution | null> {
  return store.getById(executionId);
}

export { subscribeToExecution };
