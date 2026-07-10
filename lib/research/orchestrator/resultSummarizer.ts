import type { SourceType } from "@/lib/research/schemas/enums";
import type { ManagedProviderResult } from "@/lib/research/manager/providerManager";
import type {
  ProviderSummary,
  SourceSummary,
  SearchStatistics,
} from "@/lib/research/schemas/summary.schema";
import type { RankedSource } from "@/lib/research/schemas/ranking.schema";
import { extractDomain } from "@/lib/research/utils/normalization";

// One ProviderSummary entry per provider ProviderManager actually
// attempted — its final outcome, health at that point, and whether it
// only ran because an earlier provider in its fallback chain failed.
export function buildProviderSummary(outcomes: ManagedProviderResult[]): ProviderSummary[] {
  return outcomes.map((outcome) => ({
    providerId: outcome.result.providerId,
    status: outcome.result.status,
    health: outcome.health,
    sourceCount: outcome.result.sources.length,
    latencyMs: outcome.result.tookMs,
    usedAsFallback: outcome.usedAsFallback,
  }));
}

// Aggregate facts about the final, deduplicated, ranked source list.
export function buildSourceSummary(rankedSources: RankedSource[]): SourceSummary {
  const uniqueDomains = new Set(rankedSources.map((source) => extractDomain(source.url)));

  const bySourceTypeMap = new Map<SourceType, number>();
  for (const source of rankedSources) {
    bySourceTypeMap.set(source.sourceType, (bySourceTypeMap.get(source.sourceType) ?? 0) + 1);
  }

  const averageConfidence =
    rankedSources.length > 0
      ? Math.round(
          rankedSources.reduce((sum, source) => sum + source.confidence, 0) / rankedSources.length
        )
      : null;

  return {
    totalSources: rankedSources.length,
    uniqueDomains: uniqueDomains.size,
    averageConfidence,
    bySourceType: Array.from(bySourceTypeMap.entries()).map(([sourceType, count]) => ({
      sourceType,
      count,
    })),
  };
}

// Request-level statistics for the whole runResearch() call.
export function buildSearchStatistics(
  outcomes: ManagedProviderResult[],
  totalLatencyMs: number
): SearchStatistics {
  return {
    providersQueried: outcomes.length,
    providersSucceeded: outcomes.filter((outcome) => outcome.result.status === "ok").length,
    providersFailed: outcomes.filter(
      (outcome) => outcome.result.status === "error" || outcome.result.status === "timeout"
    ).length,
    totalLatencyMs,
    fallbackTriggered: outcomes.some((outcome) => outcome.usedAsFallback),
  };
}
