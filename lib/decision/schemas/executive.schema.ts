import { z } from "zod";
import { DecisionContextSchema } from "@/lib/decision/schemas/context.schema";
import { BusinessSummarySchema } from "@/lib/decision/schemas/businessSummary.schema";
import { FindingSchema } from "@/lib/decision/schemas/finding.schema";
import { DecisionConfidenceSchema } from "@/lib/decision/schemas/confidence.schema";

// A reusable, structured Executive Summary — "No generated text" means
// every field here is a real SELECTION from an already-built
// DecisionProfile (top N strengths/weaknesses/findings, a count of
// critical risks), never newly-written prose (see
// executive/executiveSummary.ts).
export const ExecutiveSummarySchema = z.object({
  decisionContext: DecisionContextSchema,
  businessSummary: BusinessSummarySchema,
  topStrengths: z.array(z.string()),
  topWeaknesses: z.array(z.string()),
  topFindings: z.array(FindingSchema),
  criticalRiskCount: z.number().int().nonnegative(),
  confidenceSummary: DecisionConfidenceSchema,
  generatedAt: z.string(),
});

export type ExecutiveSummary = z.infer<typeof ExecutiveSummarySchema>;
