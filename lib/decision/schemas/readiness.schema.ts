import { z } from "zod";
import { ReadinessLevelSchema } from "@/lib/decision/schemas/enums";

// One readiness dimension's (currently unassessed) verdict — `level`
// stays optional rather than derived from data-completeness, for the
// same reason lib/business's BusinessHealthSchema keeps `rating`
// optional: how much is known and how ready the business actually is
// are different questions (see readiness/decisionReadiness.ts).
export const ReadinessAssessmentSchema = z.object({
  level: ReadinessLevelSchema.optional(),
  rationale: z.string().optional(),
});

export type ReadinessAssessment = z.infer<typeof ReadinessAssessmentSchema>;

// The five readiness dimensions this milestone specifies.
export const DecisionReadinessSchema = z.object({
  investment: ReadinessAssessmentSchema,
  funding: ReadinessAssessmentSchema,
  expansion: ReadinessAssessmentSchema,
  operational: ReadinessAssessmentSchema,
  technology: ReadinessAssessmentSchema,
});

export type DecisionReadiness = z.infer<typeof DecisionReadinessSchema>;
