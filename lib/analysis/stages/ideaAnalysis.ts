import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildIdeaAnalysisPrompt } from "@/lib/analysis/prompts/ideaAnalysis.prompt";

export interface IdeaAnalysisInput {
  idea: string;
}

const IdeaAnalysisOutputSchema = z.object({
  idea: z.string(),
  summary: z.string(),
});

export type IdeaAnalysisOutput = z.infer<typeof IdeaAnalysisOutputSchema>;

// Stage 1 — seeds the pipeline with a canonical idea restatement and a
// one-paragraph executive summary that every later stage references.
export async function analyze(input: IdeaAnalysisInput): Promise<IdeaAnalysisOutput> {
  const prompt = buildIdeaAnalysisPrompt(input.idea);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    IdeaAnalysisOutputSchema,
    raw,
    "Idea Analysis stage returned an unexpected response shape."
  );
}
