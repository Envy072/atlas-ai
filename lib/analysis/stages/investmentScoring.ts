import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildInvestmentScoringPrompt } from "@/lib/analysis/prompts/investmentScoring.prompt";
import { clampScore, deriveOverallScore } from "@/lib/analysis/scoring/scoring";

export interface InvestmentScoringInput {
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

const InvestmentScoringOutputSchema = z.object({
  score: z.number(),
  verdict: z.string(),
  investment_decision: z.string(),
  confidence: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  market_score: z.number().optional(),
  product_score: z.number().optional(),
  competition_score: z.number().optional(),
  execution_score: z.number().optional(),
});

export type InvestmentScoringOutput = z.infer<typeof InvestmentScoringOutputSchema>;

// Stage 10 — the investment committee's final score, verdict, and
// named strengths/weaknesses. Scores are clamped defensively (a model can
// occasionally drift outside the requested 0-100 range despite the
// prompt), and a fallback overall score is available via
// deriveOverallScore if `score` itself is ever missing.
export async function analyze(input: InvestmentScoringInput): Promise<InvestmentScoringOutput> {
  const prompt = buildInvestmentScoringPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  const parsed = parseOrThrow(
    InvestmentScoringOutputSchema,
    raw,
    "Investment Scoring stage returned an unexpected response shape."
  );

  const fallbackScore = deriveOverallScore({
    marketScore: parsed.market_score,
    productScore: parsed.product_score,
    competitionScore: parsed.competition_score,
    executionScore: parsed.execution_score,
  });

  return {
    ...parsed,
    score: clampScore(parsed.score ?? fallbackScore ?? 0),
    confidence: clampScore(parsed.confidence),
  };
}
