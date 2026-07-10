import { ATLAS_PERSONA, type PromptMessages } from "./shared";

export function buildIdeaAnalysisPrompt(idea: string): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: read the founder's raw idea description and produce a clean,
canonical restatement of it plus a concise one-paragraph executive summary.
Do not evaluate it yet — that happens in later stages.

Return exactly this JSON schema:
{
  "idea": "",
  "summary": ""
}`,
    user: idea,
  };
}
