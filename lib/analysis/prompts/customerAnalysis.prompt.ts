import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface CustomerAnalysisPromptInput {
  idea: string;
  summary: string;
  problem: string;
  solution: string;
  market_size: string;
}

export function buildCustomerAnalysisPrompt(input: CustomerAnalysisPromptInput): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: describe the ideal early customer segment for this idea — who they
are, what makes them reachable, and why they'd adopt this specific solution
first.

Return exactly this JSON schema:
{
  "customers": ""
}`,
    user: buildContextBlock(input),
  };
}
