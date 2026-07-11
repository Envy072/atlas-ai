import { z } from "zod";
import { MarketProfileSchema } from "@/lib/market/schemas/market.schema";

export const MarketDiscoveryRequestSchema = z.object({
  startupIdea: z.string().min(1),
});

export type MarketDiscoveryRequest = z.infer<typeof MarketDiscoveryRequestSchema>;

// What knowledge/marketDiscovery.ts's discoverMarket() returns: the
// resulting profile, plus `competitorCount` — a real, honest signal
// (however many candidates the Competitor Platform's own discovery found
// for the same idea), not a fabricated market-crowdedness score.
export const MarketDiscoveryResultSchema = z.object({
  request: MarketDiscoveryRequestSchema,
  profile: MarketProfileSchema,
  competitorCount: z.number().int().nonnegative(),
  generatedAt: z.string(),
});

export type MarketDiscoveryResult = z.infer<typeof MarketDiscoveryResultSchema>;
