import { runResearch } from "@/lib/research";
import { discoverCompetitors } from "@/lib/competitors";
import { discoverMarket } from "@/lib/market";
import { discoverFinancials } from "@/lib/financial";
import type {
  BusinessDiscoveryRequest,
  BusinessDiscoveryResult,
} from "@/lib/business/schemas/discovery.schema";
import { BusinessDiscoveryResultSchema } from "@/lib/business/schemas/discovery.schema";
import { buildBusinessProfile } from "@/lib/business/knowledge/businessProfileBuilder";
import { parseOrThrow } from "@/lib/validation/parse";

// Frames the startup idea as a business-synthesis query — a deliberately
// different string than lib/market's/lib/financial's own framings, since
// this call is asking the Research Engine for business-model/strategy
// signal specifically.
function buildBusinessResearchQuery(startupIdea: string): string {
  return `business model, strategy, and competitive positioning for: ${startupIdea}`;
}

// Honest, real confidence: the average of the Research Engine's own
// source confidence and the Market + Financial Platforms' own discovery
// confidences (each itself derived from real upstream signals) — never a
// flat/guessed number.
function computeDiscoveryConfidence(
  averageSourceConfidence: number | null,
  marketConfidence: number,
  financialConfidence: number
): number {
  const upstreamAverage = Math.round((marketConfidence + financialConfidence) / 2);
  if (averageSourceConfidence === null) return upstreamAverage;
  return Math.round((averageSourceConfidence + upstreamAverage) / 2);
}

// The single entry point this folder exists to provide: a startup idea
// in, a BusinessProfile out — synthesized entirely from what the
// Research, Competitor, Market, and Financial Platforms already know. Per
// this milestone's explicit rule ("Business discovery must consume ONLY:
// Research Platform, Competitor Platform, Market Platform, Financial
// Platform. Never call providers directly. Never duplicate logic already
// implemented elsewhere."), this file calls only runResearch()
// (lib/research), discoverCompetitors() (lib/competitors),
// discoverMarket() (lib/market), and discoverFinancials() (lib/financial)
// — it never constructs a provider, never re-classifies industry (reuses
// lib/market's own discoverMarket().profile.industry instead), and never
// re-derives revenue model / funding stage (reuses
// discoverFinancials().profile fields directly).
export async function discoverBusiness(
  request: BusinessDiscoveryRequest
): Promise<BusinessDiscoveryResult> {
  const [researchResult, competitorDiscovery, marketDiscovery, financialDiscovery] = await Promise.all([
    runResearch({ topic: buildBusinessResearchQuery(request.startupIdea) }),
    discoverCompetitors({ startupIdea: request.startupIdea }),
    discoverMarket({ startupIdea: request.startupIdea }),
    discoverFinancials({ startupIdea: request.startupIdea }),
  ]);

  const confidence = computeDiscoveryConfidence(
    researchResult.sourceSummary.averageConfidence,
    marketDiscovery.profile.confidence,
    financialDiscovery.profile.confidence
  );

  const profile = buildBusinessProfile({
    customerSegments: marketDiscovery.profile.customerSegments,
    revenueModel: financialDiscovery.profile.revenueModel,
    revenueStrategyRationale: financialDiscovery.profile.pricingStrategy?.rationale,
    sources: researchResult.sources,
    evidence: researchResult.evidence,
    confidence,
  });

  return parseOrThrow(
    BusinessDiscoveryResultSchema,
    {
      request,
      profile,
      competitorCount: competitorDiscovery.candidates.length,
      marketIndustry: marketDiscovery.profile.industry,
      fundingStage: financialDiscovery.profile.fundingStage,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid BusinessDiscoveryResult."
  );
}
