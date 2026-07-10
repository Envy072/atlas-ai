import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildRiskAnalysisPrompt } from "@/lib/analysis/prompts/riskAnalysis.prompt";

export interface RiskAnalysisInput {
  idea: string;
  problem: string;
  solution: string;
  market_size: string;
  competition: string;
  business_model: string;
}

const RiskAnalysisOutputSchema = z.object({
  risks: z.array(z.string()),
});

export type RiskAnalysisOutput = z.infer<typeof RiskAnalysisOutputSchema>;

// Stage 7 — the top risks that could sink this startup.
export async function analyze(input: RiskAnalysisInput): Promise<RiskAnalysisOutput> {
  const prompt = buildRiskAnalysisPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    RiskAnalysisOutputSchema,
    raw,
    "Risk Analysis stage returned an unexpected response shape."
  );
}
