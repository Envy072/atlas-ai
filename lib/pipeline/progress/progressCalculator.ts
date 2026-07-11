import type { StageRecord } from "@/lib/pipeline/schemas/stage.schema";
import type { ProgressSnapshot } from "@/lib/pipeline/schemas/progress.schema";

export const TOTAL_STAGES = 6;

// Real, deterministic composition over data already known — never a
// fabricated number (MILESTONE_11_DESIGN.md Section 7). Stage weighting
// is equal (1/6 each) as the honest starting default: there is no real
// stage-duration telemetry yet to justify weighting any stage more than
// another, and inventing one would be exactly the kind of fabrication
// every Phase 1 platform was disciplined about avoiding.
function countSucceededStages(stageHistory: StageRecord[]): number {
  const succeededStages = new Set(
    stageHistory.filter((record) => record.status === "succeeded").map((record) => record.stage)
  );
  return succeededStages.size;
}

function averageCompletedDurationMs(stageHistory: StageRecord[]): number | null {
  const durations = stageHistory
    .filter((record) => record.status === "succeeded" && record.durationMs !== undefined)
    .map((record) => record.durationMs as number);

  if (durations.length === 0) return null;
  return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
}

// Progress advances in whole-stage increments only — a running stage
// contributes 0% of its own weight until it succeeds. This milestone
// deliberately does not interpolate smooth in-progress percentages
// within a single stage, since that would require guessing at a stage's
// remaining duration before it's known.
export function computeProgress(stageHistory: StageRecord[]): ProgressSnapshot {
  const completedStages = countSucceededStages(stageHistory);
  const percent = Math.round((completedStages / TOTAL_STAGES) * 100);

  if (completedStages >= TOTAL_STAGES) {
    return { completedStages, percent };
  }

  const averageDurationMs = averageCompletedDurationMs(stageHistory);
  // No completed stage yet to average from — an honest "calculating..."
  // state, never a guessed number with no basis.
  if (averageDurationMs === null) {
    return { completedStages, percent };
  }

  const remainingStages = TOTAL_STAGES - completedStages;
  return {
    completedStages,
    percent,
    estimatedRemainingMs: Math.round(averageDurationMs * remainingStages),
  };
}
