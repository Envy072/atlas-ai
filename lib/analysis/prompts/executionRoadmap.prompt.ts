import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface ExecutionRoadmapPromptInput {
  idea: string;
  solution: string;
  business_model: string;
  risks: string[];
  opportunities: string[];
}

export function buildExecutionRoadmapPrompt(input: ExecutionRoadmapPromptInput): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: recommend the three most important next steps this founder should
take, in order, given the risks and opportunities already identified.
Prioritize validating the riskiest assumption first.

Return exactly this JSON schema:
{
  "next_steps": ["", "", ""]
}`,
    user: buildContextBlock(input),
  };
}
