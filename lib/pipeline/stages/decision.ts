import { synthesizeDecision } from "@/lib/decision";
import type { DecisionSynthesisResult } from "@/lib/decision";
import type { PipelineStageDefinition } from "@/lib/pipeline/types/stage";

// Wraps lib/decision's own public synthesizeDecision() — never a
// provider, never a deep import. See MILESTONE_11_DESIGN.md Section 5.
// This stage's result is the pipeline's final, authoritative output —
// its own `.profile` is the DecisionProfile the whole run exists to
// produce.
//
// Milestone 116 — the only one of the six stages that actually uses its
// own `executionId` parameter: passed straight through as
// synthesizeDecision()'s analysisId, scoping this run's market/
// competitor knowledge resolution to this one analysis (Milestone 114's
// Critical Finding #1).
export const decisionStage: PipelineStageDefinition<DecisionSynthesisResult> = {
  name: "decision",
  async run(startupIdea, executionId) {
    return synthesizeDecision({ startupIdea }, executionId);
  },
};
