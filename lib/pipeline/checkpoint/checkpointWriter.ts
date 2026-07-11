import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import { PipelineExecutionSchema } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore } from "@/lib/pipeline/types/storage";
import { parseOrThrow } from "@/lib/validation/parse";

// The one place "compute a transition" and "persist a transition" meet
// (MILESTONE_11_DESIGN.md Section 10). Always writes the FULL current
// execution record — a checkpoint is a snapshot, never a diff, so
// resuming never needs to replay history.
//
// Validating against PipelineExecutionSchema here — not inside the
// engine's own retry loop — is what keeps a genuine internal invariant
// violation (Section 12's "fatal, non-retryable" case) from ever being
// misclassified as a retryable stage failure: this call sits outside
// every stage's own try/catch, so if the shape is ever wrong, the error
// propagates as a real, uncaught failure instead of triggering a useless
// retry of a stage that already succeeded.
export async function writeCheckpoint(
  store: PipelineExecutionStore,
  execution: PipelineExecution
): Promise<PipelineExecution> {
  const validated = parseOrThrow(
    PipelineExecutionSchema,
    execution,
    "Failed to build a schema-valid PipelineExecution checkpoint."
  );
  await store.upsert(validated);
  return validated;
}

export async function readCheckpoint(
  store: PipelineExecutionStore,
  executionId: string
): Promise<PipelineExecution | null> {
  return store.getById(executionId);
}
