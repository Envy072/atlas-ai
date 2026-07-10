import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface CompetitionAnalysisPromptInput {
  idea: string;
  summary: string;
  problem: string;
  solution: string;
  market_size: string;
  customers: string;
}

export function buildCompetitionAnalysisPrompt(
  input: CompetitionAnalysisPromptInput
): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: map the competitive landscape for this idea — direct competitors,
indirect/substitute options, and what would make this offering defensible
against them.

Return exactly this JSON schema:
{
  "competition": ""
}`,
    user: buildContextBlock(input),
  };
}
