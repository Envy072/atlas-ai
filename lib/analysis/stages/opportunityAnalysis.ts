import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildOpportunityAnalysisPrompt } from "@/lib/analysis/prompts/opportunityAnalysis.prompt";

export interface OpportunityAnalysisInput {
  idea: string;
  market_size: string;
  customers: string;
  competition: string;
  business_model: string;
}

const OpportunityAnalysisOutputSchema = z.object({
  opportunities: z.array(z.string()),
});

export type OpportunityAnalysisOutput = z.infer<typeof OpportunityAnalysisOutputSchema>;

// Stage 8 — the strongest growth opportunities.
export async function analyze(
  input: OpportunityAnalysisInput
): Promise<OpportunityAnalysisOutput> {
  const prompt = buildOpportunityAnalysisPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    OpportunityAnalysisOutputSchema,
    raw,
    "Opportunity Analysis stage returned an unexpected response shape."
  );
}
