import { z } from "zod";
import { SeveritySchema } from "@/lib/market/schemas/enums";

// One identified market-level risk (not a company-specific one — those
// belong on lib/competitors' CompanyProfile.threats).
export const MarketRiskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  severity: SeveritySchema.optional(),
});

export type MarketRisk = z.infer<typeof MarketRiskSchema>;
