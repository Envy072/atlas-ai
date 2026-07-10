import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface RiskAnalysisPromptInput {
  idea: string;
  problem: string;
  solution: string;
  market_size: string;
  competition: string;
  business_model: string;
}

export function buildRiskAnalysisPrompt(input: RiskAnalysisPromptInput): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: identify the three most significant risks that could sink this
startup — market, execution, competitive, or business-model risks. Be
specific and concrete, not generic ("execution risk exists").

Return exactly this JSON schema:
{
  "risks": ["", "", ""]
}`,
    user: buildContextBlock(input),
  };
}
