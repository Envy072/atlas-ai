import { z } from "zod";

// What classification/industryClassifier.ts returns — crosses a boundary
// (consumed by knowledge/marketDiscovery.ts), so it's schema-validated
// like everything else that leaves its owning module.
export const MarketClassificationSchema = z.object({
  industry: z.string().min(1),
  subIndustry: z.string().optional(),
  confidence: z.number().min(0).max(100),
  reason: z.string(),
});

export type MarketClassification = z.infer<typeof MarketClassificationSchema>;
