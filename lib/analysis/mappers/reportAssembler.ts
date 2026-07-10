import { AnalysisResultSchema, type AnalysisResult } from "@/lib/schemas/analysis";
import { parseOrThrow } from "@/lib/validation/parse";
import type { PipelineContext } from "@/lib/analysis/types/context";

// Turns a fully-populated PipelineContext (every stage has run) into the
// final AnalysisResult the rest of the app already understands — the same
// shape app/api/chat/route.ts has always returned, so nothing downstream
// (the UI, the projects table) needs to know a pipeline produced it rather
// than a single OpenAI call.
export function assembleFinalReport(context: PipelineContext): AnalysisResult {
  return parseOrThrow(
    AnalysisResultSchema,
    context,
    "The analysis pipeline did not produce a complete report."
  );
}
