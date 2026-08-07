import { runResearch } from "@/lib/research";
import { discoverCompetitors, resolveCompetitorKnowledge } from "@/lib/competitors";
import { discoverMarket, resolveMarketKnowledge } from "@/lib/market";
import { discoverFinancials } from "@/lib/financial";
import { discoverBusiness } from "@/lib/business";
import type {
  DecisionSynthesisRequest,
  DecisionSynthesisResult,
} from "@/lib/decision/schemas/discovery.schema";
import { DecisionSynthesisResultSchema } from "@/lib/decision/schemas/discovery.schema";
import { buildDecisionProfile } from "@/lib/decision/engine/decisionProfileBuilder";
import { aggregateEvidence } from "@/lib/decision/evidence/evidenceAggregator";
import { deriveFindings } from "@/lib/decision/findings/findingBuilder";
import { deriveCriticalRisks } from "@/lib/decision/redflags/riskFinding";
import { deriveInvestmentThesis } from "@/lib/decision/thesis/investmentThesis";
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
// Milestone 116 — `analysisId` (the owning pipeline execution's own id)
// is a plain function parameter, not a field on DecisionSynthesisRequest:
// it exists only to scope the two resolver calls below to this one
// analysis, and DecisionSynthesisRequest is itself persisted (inside
// PipelineExecution.context.decision.request, Milestone 107/108) — a
// schema change there would need the same backward-compatibility
// handling MarketProfile.analysisId/CompanyProfile.analysisId already
// need, for no benefit, since nothing reads this specific value back
// later. Required (never optional) here: the only real caller
// (lib/pipeline/stages/decision.ts) always has its own execution id
// available from the moment it starts.
export async function synthesizeDecision(
  request: DecisionSynthesisRequest,
  analysisId: string
): Promise<DecisionSynthesisResult> {
  // TEMPORARY — Milestone 127 timeout investigation, remove after root
  // cause is confirmed.
  const fanoutStartedAt = Date.now();
  console.log(`[DECISION_TIMING] phase=fanout event=started`);

  const [researchResult, competitorDiscovery, marketDiscovery, financialDiscovery, businessDiscovery] =
    await Promise.all([
      runResearch({ topic: buildDecisionResearchQuery(request.startupIdea) }),
      discoverCompetitors({ startupIdea: request.startupIdea }),
      discoverMarket({ startupIdea: request.startupIdea }),
      discoverFinancials({ startupIdea: request.startupIdea }),
      discoverBusiness({ startupIdea: request.startupIdea }),
    ]);

  // TEMPORARY — Milestone 127 timeout investigation, remove after root
  // cause is confirmed.
  console.log(
    `[DECISION_TIMING] phase=fanout event=completed durationMs=${Date.now() - fanoutStartedAt}`
  );

  // Milestone 16: resolves this run's raw, unpersisted discovery
  // candidates into real, identity-matched CompanyProfile records — the
  // "caller's job" COMPETITOR_PLATFORM.md always said discovery itself
  // never does (MILESTONE_16_DESIGN.md). Decision never matches, builds,
  // or merges a company itself — this is a single call into
  // lib/competitors' own public barrel, exactly like every other
  // platform Decision already consumes. As of Milestone 116, scoped to
  // this analysisId — see resolveCompetitorKnowledge's own comment.
  const keyCompetitors = await resolveCompetitorKnowledge(competitorDiscovery.candidates, analysisId);

  // Milestone 17: resolves this run's freshly-built, unpersisted
  // MarketProfile into a real, identity-matched MarketProfile record —
  // the "caller's job" MARKET_PLATFORM.md always said discovery itself
  // never does (MILESTONE_17_DESIGN.md). Only the durable-knowledge
  // slice of MarketProfile accumulates (identity, durable facts,
  // evidence) — sizing/growthRate/marketMaturity stay excluded from the
  // merge contract, unchanged, per "## Knowledge vs Observation".
  // Decision never classifies, sizes, or scores a market itself. As of
  // Milestone 116, scoped to this analysisId — see
  // resolveMarketKnowledge's own comment.
  const marketProfile = await resolveMarketKnowledge(marketDiscovery.profile, analysisId);

  const aggregated = aggregateEvidence(
    [
      researchResult.sources,
      marketProfile.sources,
      financialDiscovery.profile.sources,
      businessDiscovery.profile.sources,
      ...keyCompetitors.map((competitor) => competitor.sources),
    ],
    [
      researchResult.evidence,
      marketProfile.evidence,
      financialDiscovery.profile.evidence,
      businessDiscovery.profile.evidence,
      ...keyCompetitors.map((competitor) => competitor.evidence),
    ]
  );

  // Milestone 34: real, evidence-constrained finding generation — called
  // here (already async) rather than inline inside buildDecisionProfile()
  // (kept synchronous), so this is the only new await this milestone
  // introduces at this layer (MILESTONE_34_DESIGN.md Section 5).
  //
  // TEMPORARY (the three console.log-bracketed timers below) —
  // Milestone 127 timeout investigation, remove after root cause is
  // confirmed. Measures each OpenAI generation call independently, since
  // these three run sequentially, not concurrently.
  const findingsStartedAt = Date.now();
  console.log(`[DECISION_TIMING] phase=findings event=started`);
  const findings = await deriveFindings(request.startupIdea, aggregated.evidence);
  console.log(
    `[DECISION_TIMING] phase=findings event=completed durationMs=${Date.now() - findingsStartedAt}`
  );

  // Milestone 35: real, evidence-constrained critical risk generation —
  // the identical async-migration pattern deriveFindings() above
  // already uses, applied to deriveCriticalRisks() (previously called
  // inline inside buildDecisionProfile()) (MILESTONE_35_DESIGN.md
  // Section 5).
  const risksStartedAt = Date.now();
  console.log(`[DECISION_TIMING] phase=risks event=started`);
  const criticalRisks = await deriveCriticalRisks(request.startupIdea, aggregated.evidence);
  console.log(
    `[DECISION_TIMING] phase=risks event=completed durationMs=${Date.now() - risksStartedAt}`
  );

  // Milestone 36: real, evidence-constrained investment thesis
  // generation — the identical async-migration pattern deriveFindings()/
  // deriveCriticalRisks() above already use, applied to
  // deriveInvestmentThesis() (previously called inline inside
  // buildDecisionProfile()) (MILESTONE_36_DESIGN.md Section 5). Closes
  // the last of the three facets that started this way.
  const thesisStartedAt = Date.now();
  console.log(`[DECISION_TIMING] phase=thesis event=started`);
  const investmentThesis = await deriveInvestmentThesis(request.startupIdea, aggregated.evidence);
  console.log(
    `[DECISION_TIMING] phase=thesis event=completed durationMs=${Date.now() - thesisStartedAt}`
  );

  const profile = buildDecisionProfile({
    decisionContext: {
      startupIdea: request.startupIdea,
      marketIndustry: marketProfile.industry,
      // The resolved, deduplicated count — intra-run near-duplicates
      // (e.g. "HubSpot" / "Hub Spot" grouped separately by discovery's
      // own simpler heuristic) collapse to one company via the same
      // matcher a cross-run duplicate would use, so this is a more
      // honest count than the raw candidate list's own length.
      competitorCount: keyCompetitors.length,
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
    keyCompetitors,
    marketProfile,
    // Milestone 18: passed through directly from discoverFinancials() —
    // deliberately no resolveFinancialKnowledge()-style call here, unlike
    // keyCompetitors/marketProfile above. FinancialProfile has no natural
    // cross-analysis identity to resolve against yet (no equivalent of a
    // company name or a fixed industry category), and the honest identity
    // key — a real authenticated user's project — requires Authentication
    // (still unbuilt) to exist first (MILESTONE_18_DESIGN.md Section 6).
    // Decision never estimates, forecasts, or scores a financial profile
    // itself — this is lib/financial's own, unmodified single-run output.
    financialProfile: financialDiscovery.profile,
    // Milestone 19: passed through directly from discoverBusiness() —
    // same identity blocker as financialProfile above, so no
    // resolveBusinessKnowledge()-style call here either
    // (MILESTONE_19_DESIGN.md Section 7). Additive only: businessSummary
    // and strengths/weaknesses/opportunities/threats above are NOT
    // recomputed from this — both remain the exact same hand-picked
    // projection of businessDiscovery.profile they already were before
    // this milestone. businessProfile is the same object, exposed in
    // full alongside that existing projection, not a replacement for it
    // (MILESTONE_19_DESIGN.md Section 11).
    businessProfile: businessDiscovery.profile,
    sources: aggregated.sources,
    evidence: aggregated.evidence,
    findings,
    criticalRisks,
    investmentThesis,
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
