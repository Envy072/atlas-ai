import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface ProblemAnalysisPromptInput {
  idea: string;
  summary: string;
}

export function buildProblemAnalysisPrompt(input: ProblemAnalysisPromptInput): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: identify the core customer problem this idea addresses, and the
proposed solution to it. Be specific about who feels the problem and why
existing options fall short.

Return exactly this JSON schema:
{
  "problem": "",
  "solution": ""
}`,
    user: buildContextBlock(input),
  };
}
