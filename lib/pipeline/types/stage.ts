import type { StageName } from "@/lib/pipeline/schemas/enums";

// What every stage wrapper (stages/) satisfies — a name (for events and
// history) and an async run function. `TResult` is left generic per
// stage rather than unified into one shape, since each of the six
// platforms returns a genuinely different result type; the engine
// sequences stages via six explicit, type-safe cases (see
// engine/pipelineEngine.ts) rather than a fully generic loop, so no
// stage's result is ever widened to `unknown`/`any`.
//
// Milestone 116 — `executionId` is a second, additive parameter, passed
// by the engine's one shared call site (pipelineEngine.ts) to every
// stage, but only decisionStage's own implementation actually reads it
// (threaded into synthesizeDecision() to scope market/competitor
// knowledge to this analysis — Milestone 114's Critical Finding #1).
// The other five stage wrappers are intentionally left untouched: a
// function declared with fewer parameters than its type allows is
// standard, safe TypeScript, so research/competitors/market/financial/
// business's own `run(startupIdea)` signatures satisfy this interface
// unmodified.
export interface PipelineStageDefinition<TResult> {
  name: StageName;
  run(startupIdea: string, executionId: string): Promise<TResult>;
}
