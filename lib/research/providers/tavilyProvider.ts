import type { ResearchProvider } from "@/lib/research/types/provider";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";
import type { ProviderResultStatus } from "@/lib/research/schemas/enums";
import type { Source } from "@/lib/research/schemas/source.schema";
import { SourceSchema } from "@/lib/research/schemas/source.schema";
import { fetchWithRetry, RequestTimeoutError } from "@/lib/research/utils/httpRequest";
import { extractDomain } from "@/lib/research/utils/normalization";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

// The subset of Tavily's actual REST API response this provider cares
// about (https://docs.tavily.com/documentation/api-reference/endpoint/search)
// — deliberately narrow so a change to a field we don't use doesn't
// require touching this file.
interface TavilyApiResult {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
  score?: number;
}

interface TavilyApiResponse {
  results?: TavilyApiResult[];
}

function buildResult(
  status: ProviderResultStatus,
  sources: Source[],
  topic: string,
  startedAt: number,
  error?: string
): ProviderResult {
  return {
    providerId: "tavily",
    query: topic,
    status,
    sources,
    fetchedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    ...(error ? { error } : {}),
  };
}

// Tavily returns a 0-1 relevance score per result — a real signal, not a
// fabricated one, so it maps directly to Source.confidence (0-100).
// Falls back to a neutral 50 only if Tavily omits the field entirely.
function toConfidence(score: number | undefined): number {
  if (typeof score !== "number" || Number.isNaN(score)) return 50;
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

function normalizeResults(results: TavilyApiResult[], retrievedAt: string): Source[] {
  const sources: Source[] = [];

  for (const [index, item] of results.entries()) {
    if (!item.url || !item.title) continue;

    const candidate = {
      id: `tavily_${index}_${Date.now()}`,
      providerId: "tavily" as const,
      sourceType: "search_engine" as const,
      title: item.title,
      url: item.url,
      domain: extractDomain(item.url),
      snippet: item.content,
      publishedAt: item.published_date,
      retrievedAt,
      confidence: toConfidence(item.score),
    };

    // Validate every response — a malformed individual result (e.g. a
    // non-URL string in `url`) is skipped rather than failing the whole
    // provider result.
    const parsed = SourceSchema.safeParse(candidate);
    if (parsed.success) sources.push(parsed.data);
  }

  return sources;
}

export const tavilyProvider: ResearchProvider = {
  id: "tavily",
  name: "Tavily",
  sourceType: "search_engine",

  async search(query) {
    const startedAt = Date.now();
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return buildResult(
        "not_configured",
        [],
        query.topic,
        startedAt,
        "TAVILY_API_KEY is not set in this environment."
      );
    }

    try {
      const response = await fetchWithRetry(
        TAVILY_ENDPOINT,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // The API key is sent in the request body per Tavily's documented
          // contract — never logged, never included in any error message
          // this provider produces (see buildResult/fetchWithRetry).
          body: JSON.stringify({
            api_key: apiKey,
            query: query.topic,
            max_results: query.maxResults ?? 5,
            search_depth: "basic",
          }),
        },
        { timeoutMs: 8000, maxRetries: 2 }
      );

      if (!response.ok) {
        return buildResult(
          "error",
          [],
          query.topic,
          startedAt,
          `Tavily responded with HTTP ${response.status}.`
        );
      }

      const data = (await response.json()) as TavilyApiResponse;
      const sources = normalizeResults(data.results ?? [], new Date().toISOString());

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
        error instanceof Error ? error.message : "Unknown Tavily error."
      );
    }
  },
};
