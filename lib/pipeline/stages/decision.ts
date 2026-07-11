import { synthesizeDecision } from "@/lib/decision";
import type { DecisionSynthesisResult } from "@/lib/decision";
import type { PipelineStageDefinition } from "@/lib/pipeline/types/stage";

// Wraps lib/decision's own public synthesizeDecision() — never a
// provider, never a deep import. See MILESTONE_11_DESIGN.md Section 5.
// This stage's result is the pipeline's final, authoritative output —
// its own `.profile` is the DecisionProfile the whole run exists to
// produce.
export const decisionStage: PipelineStageDefinition<DecisionSynthesisResult> = {
  name: "decision",
  async run(startupIdea) {
    return synthesizeDecision({ startupIdea });
  },
};
