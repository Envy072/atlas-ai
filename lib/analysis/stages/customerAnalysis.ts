import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildCustomerAnalysisPrompt } from "@/lib/analysis/prompts/customerAnalysis.prompt";

export interface CustomerAnalysisInput {
  idea: string;
  summary: string;
  problem: string;
  solution: string;
  market_size: string;
}

const CustomerAnalysisOutputSchema = z.object({
  customers: z.string(),
});

export type CustomerAnalysisOutput = z.infer<typeof CustomerAnalysisOutputSchema>;

// Stage 4 — the ideal early customer segment.
export async function analyze(input: CustomerAnalysisInput): Promise<CustomerAnalysisOutput> {
  const prompt = buildCustomerAnalysisPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    CustomerAnalysisOutputSchema,
    raw,
    "Customer Analysis stage returned an unexpected response shape."
  );
}
