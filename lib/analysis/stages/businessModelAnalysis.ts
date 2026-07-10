import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildBusinessModelAnalysisPrompt } from "@/lib/analysis/prompts/businessModelAnalysis.prompt";

export interface BusinessModelAnalysisInput {
  idea: string;
  summary: string;
  solution: string;
  market_size: string;
  customers: string;
  competition: string;
}

const BusinessModelAnalysisOutputSchema = z.object({
  business_model: z.string(),
});

export type BusinessModelAnalysisOutput = z.infer<typeof BusinessModelAnalysisOutputSchema>;

// Stage 6 — monetization and business model.
export async function analyze(
  input: BusinessModelAnalysisInput
): Promise<BusinessModelAnalysisOutput> {
  const prompt = buildBusinessModelAnalysisPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    BusinessModelAnalysisOutputSchema,
    raw,
    "Business Model Analysis stage returned an unexpected response shape."
  );
}
