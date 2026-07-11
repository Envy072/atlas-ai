import { z } from "zod";
import { FinancialProfileSchema } from "@/lib/financial/schemas/financial.schema";

export const FinancialDiscoveryRequestSchema = z.object({
  startupIdea: z.string().min(1),
});

export type FinancialDiscoveryRequest = z.infer<typeof FinancialDiscoveryRequestSchema>;

// What knowledge/financialDiscovery.ts's discoverFinancials() returns.
// `competitorCount`/`marketIndustry` are real, honest signals carried
// over from the Competitor/Market Platforms it consumed — not re-derived,
// per this milestone's "never duplicate existing logic" rule.
export const FinancialDiscoveryResultSchema = z.object({
  request: FinancialDiscoveryRequestSchema,
  profile: FinancialProfileSchema,
  competitorCount: z.number().int().nonnegative(),
  marketIndustry: z.string(),
  generatedAt: z.string(),
});

export type FinancialDiscoveryResult = z.infer<typeof FinancialDiscoveryResultSchema>;
