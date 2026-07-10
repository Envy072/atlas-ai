import { z } from "zod";

// Mirrors the JSON schema Atlas AI is instructed to return in
// app/api/chat/route.ts. Sub-scores are optional because the model does not
// currently produce them, but the field names are kept for components that
// will consume them later.
export const AnalysisResultSchema = z.object({
  idea: z.string(),
  summary: z.string(),

  score: z.number(),

  verdict: z.string(),
  investment_decision: z.string(),
  confidence: z.number(),

  market_score: z.number().optional(),
  product_score: z.number().optional(),
  competition_score: z.number().optional(),
  execution_score: z.number().optional(),

  customers: z.string(),

  problem: z.string(),
  solution: z.string(),

  market_size: z.string(),
  competition: z.string(),
  business_model: z.string(),

  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),

  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  next_steps: z.array(z.string()),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
