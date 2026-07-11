import type { StageRecord } from "@/lib/pipeline/schemas/stage.schema";
import type { StageName } from "@/lib/pipeline/schemas/enums";

// Retry counts are always derived from stageHistory, never tracked as
// separate counters — a derived fact can never drift from the record of
// what actually happened (MILESTONE_11_DESIGN.md Section 8).
export function countAutoRetries(stageHistory: StageRecord[], stage: StageName): number {
  return stageHistory.filter((record) => record.stage === stage && record.trigger === "auto_retry").length;
}

export function countManualRetries(stageHistory: StageRecord[], stage: StageName): number {
  return stageHistory.filter((record) => record.stage === stage && record.trigger === "manual_retry")
    .length;
}

// The attempt number the NEXT attempt at this stage should use — a
// continuous count across auto-retries, manual retries, and resumed
// attempts, so the history stays honest about how many tries a stage
// has actually had in total, not just within one call to the engine.
export function nextAttemptNumber(stageHistory: StageRecord[], stage: StageName): number {
  return stageHistory.filter((record) => record.stage === stage).length + 1;
}
