import { z } from "zod";
import { SourceSchema, EvidenceSchema } from "@/lib/research";
import { RefreshMetadataSchema } from "@/lib/competitors";
import { MarketMaturitySchema } from "@/lib/market/schemas/enums";
import { MarketSizingSchema, MarketGrowthRateSchema } from "@/lib/market/schemas/sizing.schema";
import { CustomerSegmentSchema } from "@/lib/market/schemas/segmentation.schema";
import { GeographicMarketSchema } from "@/lib/market/schemas/geography.schema";
import { MarketTrendSchema } from "@/lib/market/schemas/trends.schema";
import { RegulationSchema } from "@/lib/market/schemas/regulation.schema";
import { MarketRiskSchema } from "@/lib/market/schemas/risks.schema";

// The permanent knowledge-base record for one market — the single shape
// this whole platform exists to accumulate over time, exactly like
// lib/competitors' CompanyProfile is for one company. Every list/optional
// field starts empty/undefined because a freshly discovered market
// legitimately knows almost nothing yet (see knowledge/marketProfileBuilder.ts).
//
// `sources`/`evidence` reuse lib/research's own Source/Evidence schemas
// (imported from "@/lib/research", its public barrel), and `refresh`
// reuses lib/competitors' own RefreshMetadata schema (imported from
// "@/lib/competitors", its public barrel) — never redefined here, per this
// project's "one schema per shape" rule and this milestone's "consume
// only public exports" rule.
export const MarketProfileSchema = z.object({
  id: z.string(),
  industry: z.string().min(1),
  subIndustry: z.string().optional(),
  sizing: MarketSizingSchema,
  customerSegments: z.array(CustomerSegmentSchema),
  geographicMarkets: z.array(GeographicMarketSchema),
  growthRate: MarketGrowthRateSchema.optional(),
  marketMaturity: MarketMaturitySchema.optional(),
  regulations: z.array(RegulationSchema),
  risks: z.array(MarketRiskSchema),
  trends: z.array(MarketTrendSchema),
  sources: z.array(SourceSchema),
  evidence: z.array(EvidenceSchema),
  confidence: z.number().min(0).max(100),
  refresh: RefreshMetadataSchema,
});

export type MarketProfile = z.infer<typeof MarketProfileSchema>;
