import type { PipelineState } from "@/lib/pipeline";
import type { SessionState } from "@/lib/analysis-session/schemas/enums";

// A pure lookup table (MILESTONE_12_DESIGN.md Section 5) — never a
// decision, never new logic. If lib/pipeline ever adds a new state, this
// table gains one new row; it never grows new branching.
const STATE_PROJECTION: Record<PipelineState, SessionState> = {
  pending: "starting",
  running: "analyzing",
  retry_pending: "waiting_retry",
  stage_failed: "needs_attention",
  cancelling: "cancelling",
  completed: "completed",
  cancelled: "cancelled",
  failed: "failed",
};

export function projectSessionState(pipelineState: PipelineState): SessionState {
  return STATE_PROJECTION[pipelineState];
}
