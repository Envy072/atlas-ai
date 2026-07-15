import type { ResearchProvider } from "@/lib/research/types/provider";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";
import type { ProviderResultStatus } from "@/lib/research/schemas/enums";
import type { Source } from "@/lib/research/schemas/source.schema";
import { SourceSchema } from "@/lib/research/schemas/source.schema";
import { fetchWithRetry, RequestTimeoutError } from "@/lib/research/utils/httpRequest";
import { extractDomain } from "@/lib/research/utils/normalization";

const CRUNCHBASE_ENDPOINT = "https://api.crunchbase.com/v4/data/searches/organizations";
const CRUNCHBASE_ORG_BASE_URL = "https://www.crunchbase.com/organization";

// The subset of Crunchbase's real Data API v4 Search response this
// provider cares about (https://data.crunchbase.com/docs/using-search-apis,
// https://data.crunchbase.com/docs/examples-search-api) — confirmed
// against Crunchbase's own current documentation: the real endpoint,
// authentication mechanism, and request-body shape below are not
// guessed. The response's exact field shape (the entities/properties
// wrapper below) is the documented v4 convention, not yet verified
// against a live response in this environment — confirmed or corrected
// during this milestone's manual, real-credential verification
// (MILESTONE_32_DESIGN.md Section 3, Deliverable 2).
interface CrunchbaseIdentifier {
  permalink?: string;
}

interface CrunchbaseOrganizationProperties {
  identifier?: CrunchbaseIdentifier;
  name?: string;
  short_description?: string;
  founded_on?: { value?: string };
}

interface CrunchbaseEntity {
  properties?: CrunchbaseOrganizationProperties;
}

interface CrunchbaseSearchResponse {
  entities?: CrunchbaseEntity[];
}

function buildResult(
  status: ProviderResultStatus,
  sources: Source[],
  topic: string,
  startedAt: number,
  error?: string
): ProviderResult {
  return {
    providerId: "crunchbase",
    query: topic,
    status,
    sources,
    fetchedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    ...(error ? { error } : {}),
  };
}

// Crunchbase's Search API returns no native per-result relevance score
// (confirmed against its real, documented response fields) — the same
// situation braveProvider.ts already faces, so this reuses its own
// documented position-based heuristic rather than inventing a second,
// competing one.
function positionBasedConfidence(index: number): number {
  return Math.max(35, 90 - index * 10);
}

function normalizeResults(entities: CrunchbaseEntity[], retrievedAt: string): Source[] {
  const sources: Source[] = [];

  for (const [index, entity] of entities.entries()) {
    const properties = entity.properties;
    const title = properties?.name;
    const permalink = properties?.identifier?.permalink;

    // A result with no name or no resolvable Crunchbase organization page
    // is skipped rather than fabricated — every source-producing provider
    // must supply a real url (SourceSchema.url), and an organization's own
    // Crunchbase permalink is the one field guaranteed to resolve for any
    // indexed entity, unlike the company's own external website (which
    // this response shape doesn't even request, precisely because it is
    // frequently absent).
    if (!title || !permalink) continue;

    const url = `${CRUNCHBASE_ORG_BASE_URL}/${permalink}`;

    const candidate = {
      id: `crunchbase_${index}_${Date.now()}`,
      providerId: "crunchbase" as const,
      sourceType: "business_database" as const,
      title,
      url,
      domain: extractDomain(url),
      snippet: properties?.short_description,
      publishedAt: properties?.founded_on?.value,
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

export const crunchbaseProvider: ResearchProvider = {
  id: "crunchbase",
  name: "Crunchbase",
  sourceType: "business_database",

  async search(query) {
    const startedAt = Date.now();
    const apiKey = process.env.CRUNCHBASE_API_KEY;

    if (!apiKey) {
      return buildResult(
        "not_configured",
        [],
        query.topic,
        startedAt,
        "CRUNCHBASE_API_KEY is not set in this environment."
      );
    }

    try {
      const response = await fetchWithRetry(
        CRUNCHBASE_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // The key is sent as a header, never a query param — Crunchbase's
            // own API documents both as valid, and the header form is chosen
            // deliberately, matching braveProvider.ts's own precedent (never
            // put a secret in a URL, which could end up in a server log or
            // browser history) and this module's own safeUrlForLogging
            // safeguard in utils/httpRequest.ts.
            "X-cb-user-key": apiKey,
          },
          body: JSON.stringify({
            field_ids: ["identifier", "name", "short_description", "founded_on"],
            query: [
              {
                type: "predicate",
                field_id: "short_description",
                operator_id: "contains",
                values: [query.topic],
              },
            ],
            limit: query.maxResults ?? 5,
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
          `Crunchbase responded with HTTP ${response.status}.`
        );
      }

      const data = (await response.json()) as CrunchbaseSearchResponse;
      const sources = normalizeResults(data.entities ?? [], new Date().toISOString());

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
        error instanceof Error ? error.message : "Unknown Crunchbase error."
      );
    }
  },
};
