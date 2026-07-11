import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import { nextExecutionId } from "@/lib/pipeline/utils/id";
import { computeProgress } from "@/lib/pipeline/progress/progressCalculator";

// The one place a brand-new PipelineExecution gets constructed — starts
// in `pending` with an empty Context (just the idea) and empty history,
// mirroring how every Phase 1 platform's own profile builder starts a
// fresh record with every list/optional field empty rather than guessed.
export function buildInitialExecution(startupIdea: string, now: Date = new Date()): PipelineExecution {
  return {
    id: nextExecutionId(),
    startupIdea,
    state: "pending",
    currentStageIndex: 0,
    context: { startupIdea },
    stageHistory: [],
    progress: computeProgress([]),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
