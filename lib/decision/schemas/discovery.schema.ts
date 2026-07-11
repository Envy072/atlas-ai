import { z } from "zod";
import { DecisionProfileSchema } from "@/lib/decision/schemas/decision.schema";

export const DecisionSynthesisRequestSchema = z.object({
  startupIdea: z.string().min(1),
});

export type DecisionSynthesisRequest = z.infer<typeof DecisionSynthesisRequestSchema>;

// What engine/decisionEngine.ts's synthesizeDecision() returns.
export const DecisionSynthesisResultSchema = z.object({
  request: DecisionSynthesisRequestSchema,
  profile: DecisionProfileSchema,
  generatedAt: z.string(),
});

export type DecisionSynthesisResult = z.infer<typeof DecisionSynthesisResultSchema>;
