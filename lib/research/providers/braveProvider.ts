import type { ResearchProvider } from "@/lib/research/types/provider";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";
import type { ProviderResultStatus } from "@/lib/research/schemas/enums";
import type { Source } from "@/lib/research/schemas/source.schema";
import { SourceSchema } from "@/lib/research/schemas/source.schema";
import { fetchWithRetry, RequestTimeoutError } from "@/lib/research/utils/httpRequest";
import { extractDomain } from "@/lib/research/utils/normalization";

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

// The subset of Brave's actual REST API response this provider cares
// about (https://api-dashboard.search.brave.com/app/documentation/web-search/responses).
interface BraveApiResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
}

interface BraveApiResponse {
  web?: {
    results?: BraveApiResult[];
  };
}

function buildResult(
  status: ProviderResultStatus,
  sources: Source[],
  topic: string,
  startedAt: number,
  error?: string
): ProviderResult {
  return {
    providerId: "brave",
    query: topic,
    status,
    sources,
    fetchedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    ...(error ? { error } : {}),
  };
}

// Unlike Tavily, Brave's web search API doesn't return a per-result
// relevance score — so this is an honest, documented heuristic (earlier
// results are presumed more relevant, decaying by position), not a real
// provider-supplied confidence. Distinguishing this from Tavily's
// genuine score is deliberate — see source.schema.ts's Source.confidence
// doc comment.
function positionBasedConfidence(index: number): number {
  return Math.max(35, 90 - index * 10);
}

function normalizeResults(results: BraveApiResult[], retrievedAt: string): Source[] {
  const sources: Source[] = [];

  for (const [index, item] of results.entries()) {
    if (!item.url || !item.title) continue;

    const candidate = {
      id: `brave_${index}_${Date.now()}`,
      providerId: "brave" as const,
      sourceType: "search_engine" as const,
      title: item.title,
      url: item.url,
      domain: extractDomain(item.url),
      snippet: item.description,
      retrievedAt,
      confidence: positionBasedConfidence(index),
    };

    // Validate every response — an individually malformed result is
    // skipped rather than failing the whole provider result.
    const parsed = SourceSchema.safeParse(candidate);
    if (parsed.success) sources.push(parsed.data);
  }

  return sources;
}

export const braveProvider: ResearchProvider = {
  id: "brave",
  name: "Brave Search",
  sourceType: "search_engine",

  async search(query) {
    const startedAt = Date.now();
    const apiKey = process.env.BRAVE_API_KEY;

    if (!apiKey) {
      return buildResult(
        "not_configured",
        [],
        query.topic,
        startedAt,
        "BRAVE_API_KEY is not set in this environment."
      );
    }

    const url = new URL(BRAVE_ENDPOINT);
    url.searchParams.set("q", query.topic);
    url.searchParams.set("count", String(query.maxResults ?? 5));

    try {
      const response = await fetchWithRetry(
        url.toString(),
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            // The key is sent as a header, never a query param, and is
            // never included in any error message this provider produces.
            "X-Subscription-Token": apiKey,
          },
        },
        { timeoutMs: 8000, maxRetries: 2 }
      );

      if (!response.ok) {
        return buildResult(
          "error",
          [],
          query.topic,
          startedAt,
          `Brave Search responded with HTTP ${response.status}.`
        );
      }

      const data = (await response.json()) as BraveApiResponse;
      const sources = normalizeResults(data.web?.results ?? [], new Date().toISOString());

      return buildResult("ok", sources, query.topic, startedAt);
    } catch (error) {
      if (error instanceof RequestTimeoutError) {
        return buildResult("timeout", [], query.topic, startedAt, error.message);
      }

      return buildResult(
        "error",
        [],
        query.topic,
        startedAt,
        error instanceof Error ? error.message : "Unknown Brave Search error."
      );
    }
  },
};
