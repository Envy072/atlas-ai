import { ResearchRequestSchema, type ResearchRequest } from "@/lib/research/schemas/researchRequest.schema";
import { ResearchResultSchema, type ResearchResult } from "@/lib/research/schemas/researchResult.schema";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";
import type { ProviderId } from "@/lib/research/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";
import { selectProviders } from "@/lib/research/orchestrator/providerSelector";
import { dedupeSources } from "@/lib/research/utils/deduplication";
import { rankSources } from "@/lib/research/ranking/rankingEngine";

function buildErrorResult(providerId: ProviderId, topic: string, startedAt: number, error: unknown): ProviderResult {
  return {
    providerId,
    query: topic,
    status: "error",
    sources: [],
    fetchedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    error: error instanceof Error ? error.message : "Unknown provider error.",
  };
}

// The single entry point this whole module exists to provide: take a
// research request, fan it out to every selected provider in parallel,
// and come back with one unified, ranked, deduplicated result — fully
// functional today even though every provider currently returns zero
// real sources (see providers/*). Nothing here changes once providers
// become real; only their own `search()` bodies do.
//
// Not called by anything yet (lib/analysis/, lib/services/, and app/api/
// are frozen this milestone) — this is standalone infrastructure, wired
// in during a future milestone.
export async function runResearch(request: ResearchRequest): Promise<ResearchResult> {
  const validatedRequest = parseOrThrow(
    ResearchRequestSchema,
    request,
    "Invalid research request."
  );

  const providers = selectProviders(validatedRequest.providers);

  const providerResults = await Promise.all(
    providers.map(async (provider) => {
      const startedAt = Date.now();

      try {
        return await provider.search({
          topic: validatedRequest.topic,
          maxResults: validatedRequest.maxResultsPerProvider,
          freshnessWindowDays: validatedRequest.freshnessWindowDays,
        });
      } catch (error) {
        return buildErrorResult(provider.id, validatedRequest.topic, startedAt, error);
      }
    })
  );

  const mergedSources = providerResults.flatMap((result) => result.sources);
  const dedupedSources = dedupeSources(mergedSources);
  const rankedSources = rankSources(dedupedSources, { topic: validatedRequest.topic });

  const result: ResearchResult = {
    request: validatedRequest,
    sources: rankedSources,
    evidence: [],
    providerResults,
    generatedAt: new Date().toISOString(),
  };

  return parseOrThrow(ResearchResultSchema, result, "Failed to assemble a valid ResearchResult.");
}
