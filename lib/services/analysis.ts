import { generateStartupAnalysis } from "@/lib/services/openai";
import { AnalysisResultSchema, type AnalysisResult } from "@/lib/schemas/analysis";
import { parseOrThrow } from "@/lib/validation/parse";

// Orchestrates "turn a raw idea string into a validated AnalysisResult":
// call the model, then enforce the schema before anything downstream
// (persistence, the API response) ever sees the data.
export async function analyzeStartup(idea: string): Promise<AnalysisResult> {
  const raw = await generateStartupAnalysis(idea);

  return parseOrThrow(
    AnalysisResultSchema,
    raw,
    "Received an unexpected response from the analysis engine."
  );
}
