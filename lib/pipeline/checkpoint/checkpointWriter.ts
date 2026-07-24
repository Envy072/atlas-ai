import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import { PipelineExecutionSchema } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";
import { parseOrThrow } from "@/lib/validation/parse";

// Thrown by writeCheckpoint when a version-conditional write loses a
// race (Milestone 107's approved concurrency design) — an internal,
// pipeline-scoped signal, not a generic AppError: it's caught and
// reconciled by pipelineEngine.ts's own helpers on nearly every real
// occurrence (see writeCheckpointYieldingToCancellation), and only ever
// propagates uncaught in the genuinely unexpected case, matching this
// file's own existing precedent for a schema-validation failure. Kept
// local to lib/pipeline rather than lib/errors: it carries a
// PipelineExecution, a pipeline-domain type the cross-cutting errors
// module has no business knowing about.
export class CheckpointConflictError extends Error {
  constructor(public readonly current: PipelineExecution) {
    super(`Checkpoint conflict for execution "${current.id}" — the persisted version has already advanced.`);
    this.name = "CheckpointConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// The one place "compute a transition" and "persist a transition" meet
// (MILESTONE_11_DESIGN.md Section 10). Always writes the FULL current
// execution record — a checkpoint is a snapshot, never a diff, so
// resuming never needs to replay history.
//
// As of Milestone 107, every write is version-conditional
// (store.upsertWithVersionCheck), never the plain, unconditional
// store.upsert() this function used before — that unconditional write
// is exactly the gap Milestone 104C's Finding 1 identified: once a real
// network round-trip separates a read from a write, a blind overwrite
// can silently clobber a concurrent cancelPipeline() call. `execution`'s
// own `version` field is always "the version this in-memory snapshot
// was derived from"; on success, the returned execution carries the new,
// incremented version forward, so a caller chaining further writes
// always has the correct next expectedVersion without a second read.
export async function writeCheckpoint(
  store: PipelineExecutionStore,
  execution: PipelineExecution
): Promise<PipelineExecution> {
  const validated = parseOrThrow(
    PipelineExecutionSchema,
    execution,
    "Failed to build a schema-valid PipelineExecution checkpoint."
  );

  const result = await store.upsertWithVersionCheck(validated, validated.version);

  if (!result.success) {
    throw new CheckpointConflictError(result.current);
  }

  return { ...validated, version: result.version };
}

export async function readCheckpoint(
  store: PipelineExecutionStore,
  executionId: string
): Promise<PipelineExecution | null> {
  return store.getById(executionId);
}
