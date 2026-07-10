import { z } from "zod";
import { ProviderIdSchema, ProviderResultStatusSchema, SourceTypeSchema } from "@/lib/research/schemas/enums";
import { ProviderHealthSchema } from "@/lib/research/schemas/health.schema";

// One entry per provider that was actually queried for this request —
// what happened, how long it took, how many sources it contributed, and
// its health standing at request time (from ProviderManager's metrics,
// not just this one call's outcome).
export const ProviderSummarySchema = z.object({
  providerId: ProviderIdSchema,
  status: ProviderResultStatusSchema,
  health: ProviderHealthSchema,
  sourceCount: z.number().int().nonnegative(),
  latencyMs: z.number().nonnegative(),
  usedAsFallback: z.boolean(),
});

export type ProviderSummary = z.infer<typeof ProviderSummarySchema>;

const SourceTypeBreakdownSchema = z.object({
  sourceType: SourceTypeSchema,
  count: z.number().int().nonnegative(),
});

// Aggregate facts about the final, deduplicated, ranked source list —
// not per-provider, but across the whole result.
export const SourceSummarySchema = z.object({
  totalSources: z.number().int().nonnegative(),
  uniqueDomains: z.number().int().nonnegative(),
  averageConfidence: z.number().min(0).max(100).nullable(),
  bySourceType: z.array(SourceTypeBreakdownSchema),
});

export type SourceSummary = z.infer<typeof SourceSummarySchema>;

// Request-level statistics — how the search as a whole behaved, useful
// for monitoring/debugging without having to recompute it from
// providerResults every time.
export const SearchStatisticsSchema = z.object({
  providersQueried: z.number().int().nonnegative(),
  providersSucceeded: z.number().int().nonnegative(),
  providersFailed: z.number().int().nonnegative(),
  totalLatencyMs: z.number().nonnegative(),
  fallbackTriggered: z.boolean(),
});

export type SearchStatistics = z.infer<typeof SearchStatisticsSchema>;
