import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface MarketAnalysisPromptInput {
  idea: string;
  summary: string;
  problem: string;
  solution: string;
}

export function buildMarketAnalysisPrompt(input: MarketAnalysisPromptInput): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: size the realistic market opportunity for this idea. State your
reasoning and assumptions plainly rather than inventing a precise figure
with no basis.

Return exactly this JSON schema:
{
  "market_size": ""
}`,
    user: buildContextBlock(input),
  };
}
