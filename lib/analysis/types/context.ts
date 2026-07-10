import type { AnalysisResult } from "@/lib/schemas/analysis";

// The pipeline accumulates one stage's output into this shape at a time,
// starting from just `{ idea }` and ending as a complete AnalysisResult.
// Derived from the existing schema type rather than hand-duplicated, so
// the pipeline and the rest of the app can never drift out of sync on
// what a "complete" analysis looks like.
export type PipelineContext = Partial<AnalysisResult> & Pick<AnalysisResult, "idea">;
