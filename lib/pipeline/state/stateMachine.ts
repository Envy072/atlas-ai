import type { PipelineState } from "@/lib/pipeline/schemas/enums";

// The valid transition table from MILESTONE_11_DESIGN.md Section 6 —
// encodes exactly which state transitions are legal, so a bug elsewhere
// in the engine can never silently produce an invalid state.
//
// "resuming" does not appear here — resumePipeline() resolves it
// synchronously (read the checkpoint, decide, act) without ever
// persisting it as an intermediate state; see PIPELINE.md.
//
// `running -> failed` exists for a genuine internal invariant violation
// (e.g. this platform's own schema validation failing while building a
// checkpoint) — never for an ordinary stage-call failure, which always
// routes through `retry_pending`/`stage_failed` instead (Section 12).
const VALID_TRANSITIONS: Record<PipelineState, readonly PipelineState[]> = {
  pending: ["running", "failed"],
  running: ["running", "completed", "retry_pending", "stage_failed", "cancelling", "failed"],
  retry_pending: ["running", "cancelling", "cancelled"],
  stage_failed: ["running", "cancelled"],
  cancelling: ["cancelled"],
  completed: [],
  cancelled: [],
  failed: [],
};

const TERMINAL_STATES: ReadonlySet<PipelineState> = new Set(["completed", "cancelled", "failed"]);

export function isTerminalState(state: PipelineState): boolean {
  return TERMINAL_STATES.has(state);
}

export function canTransition(from: PipelineState, to: PipelineState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PipelineState, to: PipelineState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid pipeline state transition: "${from}" -> "${to}".`);
  }
}
