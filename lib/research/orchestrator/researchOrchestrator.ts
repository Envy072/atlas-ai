import { ResearchRequestSchema, type ResearchRequest } from "@/lib/research/schemas/researchRequest.schema";
import { ResearchResultSchema, type ResearchResult } from "@/lib/research/schemas/researchResult.schema";
import { parseOrThrow } from "@/lib/validation/parse";
import { dedupeSources } from "@/lib/research/utils/deduplication";
import { rankSources } from "@/lib/research/ranking/rankingEngine";
import { searchViaProviderManager } from "@/lib/research/manager/providerManager";
import { buildEvidence } from "@/lib/research/evidence/evidenceBuilder";
import {
  buildProviderSummary,
  buildSourceSummary,
  buildSearchStatistics,
} from "@/lib/research/orchestrator/resultSummarizer";

// The single entry point this whole module exists to provide: take a
// research request and come back with one unified, ranked, deduplicated,
// evidence-backed result.
//
// Milestone 5 change: this no longer calls providers directly (Step 1's
// core rule — "The Orchestrator must communicate with ProviderManager,
// not directly with providers"). ProviderManager owns provider selection,
// fallback, retry, timeout, and health/metrics tracking; this function's
// job is purely to take ProviderManager's output and turn it into a
// ResearchResult — merge, dedupe, rank, build evidence, summarize.
//
// Not called by anything outside lib/research/ yet — see
// RESEARCH_ENGINE.md / PROVIDER_MANAGER.md's Future Integration Plan.
export async function runResearch(request: ResearchRequest): Promise<ResearchResult> {
  const validatedRequest = parseOrThrow(
    ResearchRequestSchema,
    request,
    "Invalid research request."
  );

  const requestStartedAt = Date.now();

  const outcomes = await searchViaProviderManager(
    {
      topic: validatedRequest.topic,
      maxResults: validatedRequest.maxResultsPerProvider,
      freshnessWindowDays: validatedRequest.freshnessWindowDays,
    },
    { providerIds: validatedRequest.providers }
  );

  const providerResults = outcomes.map((outcome) => outcome.result);
  const mergedSources = providerResults.flatMap((result) => result.sources);
  const dedupedSources = dedupeSources(mergedSources);
  const rankedSources = rankSources(dedupedSources, { topic: validatedRequest.topic });

  // Step 7: populate the real Evidence model from real provider data. The
  // "claim" is the source's own title (a research-stage claim — "this
  // source exists and says X") until a future pipeline stage builds a
  // more specific claim from it; the confidence is the source's own
  // (Tavily's real relevance score, or Brave's documented position-based
  // heuristic — see each provider's own comments), never fabricated here.
  const evidence = rankedSources.map((source) =>
    buildEvidence({
      claim: source.title,
      evidence: source.snippet ?? source.title,
      confidence: source.confidence,
      source,
    })
  );

  const result: ResearchResult = {
    request: validatedRequest,
    sources: rankedSources,
    evidence,
    providerResults,
    providerSummary: buildProviderSummary(outcomes),
    sourceSummary: buildSourceSummary(rankedSources),
    searchStatistics: buildSearchStatistics(outcomes, Date.now() - requestStartedAt),
    generatedAt: new Date().toISOString(),
  };

  return parseOrThrow(ResearchResultSchema, result, "Failed to assemble a valid ResearchResult.");
}
