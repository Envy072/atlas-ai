import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildProblemAnalysisPrompt } from "@/lib/analysis/prompts/problemAnalysis.prompt";

export interface ProblemAnalysisInput {
  idea: string;
  summary: string;
}

const ProblemAnalysisOutputSchema = z.object({
  problem: z.string(),
  solution: z.string(),
});

export type ProblemAnalysisOutput = z.infer<typeof ProblemAnalysisOutputSchema>;

// Stage 2 — the core customer problem and the proposed solution, paired
// together since a solution only makes sense in response to a problem.
export async function analyze(input: ProblemAnalysisInput): Promise<ProblemAnalysisOutput> {
  const prompt = buildProblemAnalysisPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    ProblemAnalysisOutputSchema,
    raw,
    "Problem Analysis stage returned an unexpected response shape."
  );
}
