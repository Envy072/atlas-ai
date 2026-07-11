import { z } from "zod";
import { FundingStageSchema } from "@/lib/financial";

// What is being decided about — real signals reused directly from the
// Market/Competitor/Financial Platforms' own discovery results, never
// re-derived. Every field optional except the idea itself, since a
// decision synthesis run might not have a real classification/funding
// signal available (e.g. no configured search providers).
export const DecisionContextSchema = z.object({
  startupIdea: z.string().min(1),
  marketIndustry: z.string().optional(),
  competitorCount: z.number().int().nonnegative().optional(),
  fundingStage: FundingStageSchema.optional(),
});

export type DecisionContext = z.infer<typeof DecisionContextSchema>;
