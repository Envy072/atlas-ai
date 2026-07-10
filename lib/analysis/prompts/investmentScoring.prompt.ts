import { ATLAS_PERSONA, buildContextBlock, type PromptMessages } from "./shared";

interface InvestmentScoringPromptInput {
  idea: string;
  summary: string;
  problem: string;
  solution: string;
  market_size: string;
  customers: string;
  competition: string;
  business_model: string;
  risks: string[];
  opportunities: string[];
  next_steps: string[];
}

export function buildInvestmentScoringPrompt(input: InvestmentScoringPromptInput): PromptMessages {
  return {
    system: `${ATLAS_PERSONA}

Task: act as the investment committee making a final call on this startup,
having reviewed the problem, solution, market, customers, competition,
business model, risks, opportunities, and roadmap above. Score it 0-100,
render a verdict and an investment decision, state your confidence 0-100,
and name concrete strengths and weaknesses (three each). Also score the
market, product, competition, and execution dimensions individually,
0-100.

Return exactly this JSON schema:
{
  "score": 90,
  "verdict": "",
  "investment_decision": "",
  "confidence": 91,
  "strengths": ["", "", ""],
  "weaknesses": ["", "", ""],
  "market_score": 0,
  "product_score": 0,
  "competition_score": 0,
  "execution_score": 0
}`,
    user: buildContextBlock(input),
  };
}
