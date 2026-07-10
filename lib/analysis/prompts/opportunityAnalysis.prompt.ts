import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface OpportunityAnalysisPromptInput {
  idea: string;
  market_size: string;
  customers: string;
  competition: string;
  business_model: string;
}

export function buildOpportunityAnalysisPrompt(
  input: OpportunityAnalysisPromptInput
): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: identify the three strongest growth opportunities for this startup —
adjacent markets, product expansion, distribution advantages, or timing
factors currently in its favor.

Return exactly this JSON schema:
{
  "opportunities": ["", "", ""]
}`,
    user: buildContextBlock(input),
  };
}
