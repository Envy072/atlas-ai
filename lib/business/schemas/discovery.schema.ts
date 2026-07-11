import { z } from "zod";
import { FundingStageSchema } from "@/lib/financial";
import { BusinessProfileSchema } from "@/lib/business/schemas/business.schema";

export const BusinessDiscoveryRequestSchema = z.object({
  startupIdea: z.string().min(1),
});

export type BusinessDiscoveryRequest = z.infer<typeof BusinessDiscoveryRequestSchema>;

// What knowledge/businessDiscovery.ts's discoverBusiness() returns.
// `competitorCount`/`marketIndustry`/`fundingStage` are real, honest
// signals carried over from the Competitor/Market/Financial Platforms it
// consumed — not re-derived, per this milestone's "never duplicate logic
// already implemented elsewhere" rule. `fundingStage` reuses
// lib/financial's own FundingStage schema rather than redefining it.
export const BusinessDiscoveryResultSchema = z.object({
  request: BusinessDiscoveryRequestSchema,
  profile: BusinessProfileSchema,
  competitorCount: z.number().int().nonnegative(),
  marketIndustry: z.string(),
  fundingStage: FundingStageSchema.optional(),
  generatedAt: z.string(),
});

export type BusinessDiscoveryResult = z.infer<typeof BusinessDiscoveryResultSchema>;
