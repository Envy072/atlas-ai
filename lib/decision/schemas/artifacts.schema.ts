import { z } from "zod";
import { RecommendationSchema } from "@/lib/business";
import { DecisionVerdictSchema } from "@/lib/decision/schemas/verdict.schema";

// Milestone 115 — the persisted shape of buildDecisionArtifacts()'s own
// return value (lib/decision/artifacts/decisionArtifacts.ts), promoted
// from a plain, unvalidated TypeScript interface to a real schema now
// that it's actually stored (Project.decisionArtifacts) and read back
// through parseOrThrow, not just passed directly between two in-memory
// function calls in the same request.
export const DecisionArtifactsSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  verdict: DecisionVerdictSchema.optional(),
});

export type DecisionArtifacts = z.infer<typeof DecisionArtifactsSchema>;
