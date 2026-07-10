// Public entry point for the analysis pipeline. Not yet wired into
// app/api/chat/route.ts — see PIPELINE.md for the current cutover status.
export { runAnalysisPipeline } from "@/lib/analysis/pipeline/runAnalysisPipeline";
export type { PipelineContext } from "@/lib/analysis/types/context";
export type { AnalysisStageFn } from "@/lib/analysis/types/stage";
