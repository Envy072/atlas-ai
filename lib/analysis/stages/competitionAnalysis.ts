import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildCompetitionAnalysisPrompt } from "@/lib/analysis/prompts/competitionAnalysis.prompt";

export interface CompetitionAnalysisInput {
  idea: string;
  summary: string;
  problem: string;
  solution: string;
  market_size: string;
  customers: string;
}

const CompetitionAnalysisOutputSchema = z.object({
  competition: z.string(),
});

export type CompetitionAnalysisOutput = z.infer<typeof CompetitionAnalysisOutputSchema>;

// Stage 5 — the competitive landscape.
export async function analyze(
  input: CompetitionAnalysisInput
): Promise<CompetitionAnalysisOutput> {
  const prompt = buildCompetitionAnalysisPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    CompetitionAnalysisOutputSchema,
    raw,
    "Competition Analysis stage returned an unexpected response shape."
  );
}
