import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildMarketAnalysisPrompt } from "@/lib/analysis/prompts/marketAnalysis.prompt";

export interface MarketAnalysisInput {
  idea: string;
  summary: string;
  problem: string;
  solution: string;
}

const MarketAnalysisOutputSchema = z.object({
  market_size: z.string(),
});

export type MarketAnalysisOutput = z.infer<typeof MarketAnalysisOutputSchema>;

// Stage 3 — sizes the market opportunity.
export async function analyze(input: MarketAnalysisInput): Promise<MarketAnalysisOutput> {
  const prompt = buildMarketAnalysisPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    MarketAnalysisOutputSchema,
    raw,
    "Market Analysis stage returned an unexpected response shape."
  );
}
