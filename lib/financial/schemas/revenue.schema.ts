import { z } from "zod";

// The archetypes a startup's revenue model commonly falls into. Optional
// at the profile level (never defaulted) when a real revenue model hasn't
// been identified yet.
export const RevenueModelSchema = z.enum([
  "subscription",
  "transactional",
  "usage_based",
  "marketplace",
  "advertising",
  "licensing",
  "hybrid",
]);

export type RevenueModel = z.infer<typeof RevenueModelSchema>;

// One named revenue stream. `estimatedMonthlyUsd` is a plain optional
// number (not the heavier FinancialEstimateSchema wrapper) — the same
// choice lib/market made for CustomerSegment.estimatedSizeUsd: a list
// item's size is a simple optional fact, while FinancialEstimateSchema's
// extra methodology/confidence fields are reserved for profile-level
// aggregate metrics (see schemas/financial.schema.ts).
export const RevenueStreamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  revenueModel: RevenueModelSchema.optional(),
  estimatedMonthlyUsd: z.number().nonnegative().optional(),
});

export type RevenueStream = z.infer<typeof RevenueStreamSchema>;
