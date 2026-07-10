import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface BusinessModelAnalysisPromptInput {
  idea: string;
  summary: string;
  solution: string;
  market_size: string;
  customers: string;
  competition: string;
}

export function buildBusinessModelAnalysisPrompt(
  input: BusinessModelAnalysisPromptInput
): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: define a realistic business model — how this idea makes money, the
likely pricing approach, and why it fits the customer segment and
competitive landscape already established.

Return exactly this JSON schema:
{
  "business_model": ""
}`,
    user: buildContextBlock(input),
  };
}
