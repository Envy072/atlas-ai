import type { RankedSource, Evidence } from "@/lib/research";
import { runResearch } from "@/lib/research";
import type {
  CompetitorDiscoveryRequest,
  CompetitorDiscoveryResult,
  DiscoveredCompetitor,
} from "@/lib/competitors/schemas/discovery.schema";
import { CompetitorDiscoveryResultSchema } from "@/lib/competitors/schemas/discovery.schema";
import { extractCandidateName } from "@/lib/competitors/discovery/candidateExtraction";
import { normalizeCompanyName } from "@/lib/competitors/utils/companyNormalization";
import { extractCompanyDomain } from "@/lib/competitors/utils/urlNormalization";
import { parseOrThrow } from "@/lib/validation/parse";

const DEFAULT_MAX_CANDIDATES = 10;

// Turns a startup idea into the query the (frozen, unmodified) Research
// Engine actually searches for. Deliberately biased toward "who else does
// this" phrasing rather than passing the idea through verbatim, since a
// literal idea description ("an app that helps X do Y") is a worse search
// query than a competitor-discovery-shaped one.
function buildDiscoveryQuery(startupIdea: string): string {
  return `companies competing with: ${startupIdea}`;
}

interface CandidateGroup {
  rawName: string;
  sources: RankedSource[];
  evidence: Evidence[];
}

// Groups ranked sources (and their matching evidence) by normalized
// candidate name, so three sources all mentioning "HubSpot" become one
// DiscoveredCompetitor instead of three near-duplicates. Entity matching
// against the *existing knowledge base* (matcher/entityMatcher.ts) happens
// later, once a caller decides to accept a candidate — this grouping only
// dedupes within a single discovery run's own results.
function groupByCandidateName(
  sources: RankedSource[],
  evidence: Evidence[]
): Map<string, CandidateGroup> {
  const groups = new Map<string, CandidateGroup>();

  for (const source of sources) {
    const rawName = extractCandidateName(source);
    const key = normalizeCompanyName(rawName) || extractCompanyDomain(source.url);
    const matchingEvidence = evidence.filter((item) => item.url === source.url);

    const existing = groups.get(key);
    if (existing) {
      existing.sources.push(source);
      existing.evidence.push(...matchingEvidence);
    } else {
      groups.set(key, { rawName, sources: [source], evidence: matchingEvidence });
    }
  }

  return groups;
}

function averageConfidence(sources: RankedSource[]): number {
  const total = sources.reduce((sum, source) => sum + source.confidence, 0);
  return Math.round(total / sources.length);
}

// Only a source the Research Engine itself typed as "company_website" is
// trustworthy as *the* company's site — a news article or forum post that
// merely mentions the company is not its website, even though it counts as
// supporting evidence.
function findOfficialWebsite(sources: RankedSource[]): string | undefined {
  return sources.find((source) => source.sourceType === "company_website")?.url;
}

// The single entry point this folder exists to provide: a startup idea in,
// a deduplicated list of potential competitors out — grounded entirely in
// what the Research Engine actually found (see PROVIDER_MANAGER.md for
// why that may be an empty list in an environment with no configured
// search-provider credentials; an honest empty result, never a fabricated
// one). Per this milestone's explicit rule, this calls only runResearch()
// from lib/research's public barrel — it never constructs a provider or
// searches directly.
export async function discoverCompetitors(
  request: CompetitorDiscoveryRequest
): Promise<CompetitorDiscoveryResult> {
  const maxCandidates = request.maxCandidates ?? DEFAULT_MAX_CANDIDATES;

  const researchResult = await runResearch({ topic: buildDiscoveryQuery(request.startupIdea) });

  const groups = groupByCandidateName(researchResult.sources, researchResult.evidence);

  const candidates: DiscoveredCompetitor[] = Array.from(groups.values())
    .map((group) => ({
      candidateName: group.rawName,
      website: findOfficialWebsite(group.sources),
      sources: group.sources,
      evidence: group.evidence,
      confidence: averageConfidence(group.sources),
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxCandidates);

  return parseOrThrow(
    CompetitorDiscoveryResultSchema,
    {
      request,
      candidates,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid CompetitorDiscoveryResult."
  );
}
