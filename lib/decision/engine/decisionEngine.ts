import { runResearch } from "@/lib/research";
import { discoverCompetitors } from "@/lib/competitors";
import { discoverMarket } from "@/lib/market";
import { discoverFinancials } from "@/lib/financial";
import { discoverBusiness } from "@/lib/business";
import type {
  DecisionSynthesisRequest,
  DecisionSynthesisResult,
} from "@/lib/decision/schemas/discovery.schema";
import { DecisionSynthesisResultSchema } from "@/lib/decision/schemas/discovery.schema";
import { buildDecisionProfile } from "@/lib/decision/engine/decisionProfileBuilder";
import { aggregateEvidence } from "@/lib/decision/evidence/evidenceAggregator";
import { parseOrThrow } from "@/lib/validation/parse";

// Frames the startup idea as a decision-synthesis query — a deliberately
// different string than any of the four platforms below it use for
// their own runResearch() calls, since this call is asking specifically
// for investment/decision-relevant signal.
function buildDecisionResearchQuery(startupIdea: string): string {
  return `investment decision synthesis for: ${startupIdea}`;
}

// The single entry point this platform exists to provide: a startup idea
// in, a DecisionProfile out — synthesized entirely from what the
// Research, Competitor, Market, Financial, and Business Platforms
// already know. Per this milestone's explicit rule ("Decision
// Intelligence consumes ONLY: Research Platform, Competitor Platform,
// Market Platform, Financial Platform, Business Intelligence Platform.
// Never call providers. Never duplicate logic. Never recompute
// lower-layer knowledge."), this file calls only runResearch()
// (lib/research), discoverCompetitors() (lib/competitors),
// discoverMarket() (lib/market), discoverFinancials() (lib/financial),
// and discoverBusiness() (lib/business) — concurrently, and never a
// provider, never an internal function of any of the five.
//
// Every one of Business's own upstream calls is repeated here rather
// than assumed from discoverBusiness()'s own passthrough fields, because
// discoverBusiness() only exposes a few of its own upstream signals
// (competitorCount, marketIndustry, fundingStage) — richer data (the
// full CompetitorDiscoveryResult, MarketProfile, FinancialProfile) still
// requires calling those platforms' own discover*() functions directly.
// This mirrors exactly how Business Platform itself calls
// Research+Competitors+Market+Financial directly even though Financial
// already calls Market+Competitors+Research internally — an established,
// architecturally sound pattern (verified in ARCHITECTURE_REVIEW.md
// Check 3), not a duplication of logic.
export async function synthesizeDecision(
  request: DecisionSynthesisRequest
): Promise<DecisionSynthesisResult> {
  const [researchResult, competitorDiscovery, marketDiscovery, financialDiscovery, businessDiscovery] =
    await Promise.all([
      runResearch({ topic: buildDecisionResearchQuery(request.startupIdea) }),
      discoverCompetitors({ startupIdea: request.startupIdea }),
      discoverMarket({ startupIdea: request.startupIdea }),
      discoverFinancials({ startupIdea: request.startupIdea }),
      discoverBusiness({ startupIdea: request.startupIdea }),
    ]);

  const aggregated = aggregateEvidence(
    [
      researchResult.sources,
      marketDiscovery.profile.sources,
      financialDiscovery.profile.sources,
      businessDiscovery.profile.sources,
      ...competitorDiscovery.candidates.map((candidate) => candidate.sources),
    ],
    [
      researchResult.evidence,
      marketDiscovery.profile.evidence,
      financialDiscovery.profile.evidence,
      businessDiscovery.profile.evidence,
      ...competitorDiscovery.candidates.map((candidate) => candidate.evidence),
    ]
  );

  const profile = buildDecisionProfile({
    decisionContext: {
      startupIdea: request.startupIdea,
      marketIndustry: marketDiscovery.profile.industry,
      competitorCount: competitorDiscovery.candidates.length,
      fundingStage: financialDiscovery.profile.fundingStage,
    },
    businessSummary: {
      businessModel: businessDiscovery.profile.businessModel,
      valueProposition: businessDiscovery.profile.valueProposition,
      customerProblem: businessDiscovery.profile.customerProblem,
      competitivePosition: businessDiscovery.profile.competitivePosition,
      overallHealth: businessDiscovery.profile.overallHealth,
    },
    strengths: businessDiscovery.profile.businessStrengths,
    weaknesses: businessDiscovery.profile.businessWeaknesses,
    opportunities: businessDiscovery.profile.businessOpportunities,
    threats: businessDiscovery.profile.businessThreats,
    sources: aggregated.sources,
    evidence: aggregated.evidence,
  });

  return parseOrThrow(
    DecisionSynthesisResultSchema,
    {
      request,
      profile,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid DecisionSynthesisResult."
  );
}
