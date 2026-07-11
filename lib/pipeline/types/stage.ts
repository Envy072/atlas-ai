import type { StageName } from "@/lib/pipeline/schemas/enums";

// What every stage wrapper (stages/) satisfies — a name (for events and
// history) and a single-argument async run function. `TResult` is left
// generic per stage rather than unified into one shape, since each of
// the six platforms returns a genuinely different result type; the
// engine sequences stages via six explicit, type-safe cases (see
// engine/pipelineEngine.ts) rather than a fully generic loop, so no
// stage's result is ever widened to `unknown`/`any`.
export interface PipelineStageDefinition<TResult> {
  name: StageName;
  run(startupIdea: string): Promise<TResult>;
}
