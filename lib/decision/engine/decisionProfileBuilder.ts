import type { Source, Evidence } from "@/lib/research";
import type { CompanyProfile } from "@/lib/competitors";
import type { MarketProfile } from "@/lib/market";
import type { FinancialProfile } from "@/lib/financial";
import type { BusinessProfile } from "@/lib/business";
import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import { DecisionProfileSchema } from "@/lib/decision/schemas/decision.schema";
import type { DecisionContext } from "@/lib/decision/schemas/context.schema";
import type { BusinessSummary } from "@/lib/decision/schemas/businessSummary.schema";
import { deriveEmptyThesis } from "@/lib/decision/thesis/investmentThesis";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import { deriveCriticalRisks } from "@/lib/decision/redflags/riskFinding";
import { deriveDecisionReadiness } from "@/lib/decision/readiness/decisionReadiness";
import { computeDecisionConfidence } from "@/lib/decision/confidence/decisionConfidence";
import type { CoverageChecklist } from "@/lib/decision/types/confidence";
import { buildDecisionRefreshMetadata } from "@/lib/decision/refresh/decisionRefreshPolicy";
import { parseOrThrow } from "@/lib/validation/parse";

let decisionIdCounter = 0;

function nextDecisionId(): string {
  decisionIdCounter += 1;
  return `decision_${Date.now()}_${decisionIdCounter}`;
}

const ALWAYS_TRUE_LIMITATION =
  "Scoring dimensions across the Business, Financial, Market, and Competitor Platforms are architecture-only placeholders and do not yet reflect real analysis.";
const NO_EVIDENCE_LIMITATION =
  "No evidence was gathered for this synthesis run — likely because no search-provider credentials are configured in this environment (see PROVIDER_MANAGER.md).";

function deriveOpenQuestions(businessSummary: BusinessSummary): string[] {
  const questions: string[] = [];

  if (!businessSummary.valueProposition) questions.push("Value proposition has not been established yet.");
  if (!businessSummary.customerProblem) questions.push("Customer problem has not been established yet.");
  if (!businessSummary.businessModel) questions.push("Business model has not been established yet.");
  if (!businessSummary.competitivePosition) {
    questions.push("Competitive position has not been assessed yet.");
  }

  return questions;
}

function deriveDecisionLimitations(hasEvidence: boolean): string[] {
  const limitations = [ALWAYS_TRUE_LIMITATION];
  if (!hasEvidence) limitations.push(NO_EVIDENCE_LIMITATION);
  return limitations;
}

export interface BuildDecisionProfileInput {
  decisionContext: DecisionContext;
  businessSummary: BusinessSummary;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  threats?: string[];
  // Milestone 16, additive — real, persisted CompanyProfile records
  // resolved by lib/competitors.resolveCompetitorKnowledge(), reused
  // verbatim (never recomputed here — see MILESTONE_16_DESIGN.md
  // Section 9).
  keyCompetitors?: CompanyProfile[];
  // Milestone 17, additive, required (not optional like keyCompetitors)
  // — discoverMarket() always produces a MarketProfile, even for an
  // "unclassified" industry, so a caller always has one to pass. Reused
  // verbatim from lib/market.resolveMarketKnowledge() — never recomputed
  // here (MILESTONE_17_DESIGN.md Section 14).
  marketProfile: MarketProfile;
  // Milestone 18, additive, required (not optional) — discoverFinancials()
  // always produces a FinancialProfile, even when every FinancialEstimate
  // field is honestly value-absent. Reused verbatim, passed through
  // directly from lib/financial.discoverFinancials() — never resolved,
  // merged, or persisted here (MILESTONE_18_DESIGN.md Section 6: no
  // natural cross-analysis identity exists for FinancialProfile yet).
  financialProfile: FinancialProfile;
  // Milestone 19, additive, required (not optional) — discoverBusiness()
  // always produces a BusinessProfile. Reused verbatim, passed through
  // directly from lib/business.discoverBusiness() — never resolved,
  // merged, or persisted here (MILESTONE_19_DESIGN.md Section 7: same
  // identity blocker as FinancialProfile). `businessSummary` above stays
  // the pre-existing, hand-picked projection of this same profile — this
  // function does not derive one from the other (MILESTONE_19_DESIGN.md
  // Section 11).
  businessProfile: BusinessProfile;
  sources?: Source[];
  evidence?: Evidence[];
  // Milestone 34, additive — real, evidence-constrained findings
  // computed by the caller via deriveFindings() (now async, since real
  // generation requires a network call) and passed in here already
  // computed, exactly like every other cross-platform input above.
  // buildDecisionProfile() itself stays synchronous — deriveFindings()
  // is called from synthesizeDecision() (already async), never from
  // here, so this function's own signature and every existing caller
  // of it (including buildDecisionProfileFixture() and its 24 call
  // sites) are unaffected by this milestone (MILESTONE_34_DESIGN.md
  // Section 5).
  findings?: Finding[];
  now?: Date;
}

// The one place a brand-new DecisionProfile gets constructed — mirrors
// the other four platforms' own profile builders, but this one's job is
// entirely SYNTHESIS: it composes every facet folder's own (real-
// passthrough-or-honestly-empty) output into one schema-valid object.
// `strengths`/`weaknesses`/`opportunities`/`threats` are the caller's
// (the Business Platform's own SWOT, reused verbatim) — this function
// never recomputes them.
export function buildDecisionProfile(input: BuildDecisionProfileInput): DecisionProfile {
  const now = input.now ?? new Date();
  const sources = input.sources ?? [];
  const evidence = input.evidence ?? [];
  const keyCompetitors = input.keyCompetitors ?? [];

  const findings = input.findings ?? [];
  const criticalRisks = deriveCriticalRisks();

  const checklist: CoverageChecklist = {
    hasBusinessModel: Boolean(input.businessSummary.businessModel),
    hasValueProposition: Boolean(input.businessSummary.valueProposition),
    hasCustomerProblem: Boolean(input.businessSummary.customerProblem),
    // Fixed, Milestone 17 ("## Design Deviation",
    // MILESTONE_17_DESIGN.md): classifyIndustry() always returns a
    // non-empty string ("unclassified" when nothing matches, never
    // undefined), so a bare Boolean() check here was vacuously true on
    // every DecisionProfile ever built — this now requires a real,
    // non-"unclassified" classification to count as coverage.
    hasMarketIndustry:
      Boolean(input.decisionContext.marketIndustry) && input.decisionContext.marketIndustry !== "unclassified",
    hasFundingStage: Boolean(input.decisionContext.fundingStage),
    hasFindings: findings.length > 0,
    hasCriticalRisks: criticalRisks.length > 0,
    hasEvidence: evidence.length > 0,
    hasCompetitorProfiles: keyCompetitors.length > 0,
    hasMarketProfile: input.marketProfile.industry !== "unclassified",
  };

  const confidenceSummary = computeDecisionConfidence({ sources, evidence, checklist });

  return parseOrThrow(
    DecisionProfileSchema,
    {
      id: nextDecisionId(),
      decisionContext: input.decisionContext,
      businessSummary: input.businessSummary,
      investmentThesis: deriveEmptyThesis(),
      keyFindings: findings,
      strengths: input.strengths ?? [],
      weaknesses: input.weaknesses ?? [],
      opportunities: input.opportunities ?? [],
      threats: input.threats ?? [],
      criticalRisks,
      keyCompetitors,
      marketProfile: input.marketProfile,
      financialProfile: input.financialProfile,
      businessProfile: input.businessProfile,
      sources,
      evidence,
      confidenceSummary,
      openQuestions: deriveOpenQuestions(input.businessSummary),
      decisionReadiness: deriveDecisionReadiness(),
      decisionLimitations: deriveDecisionLimitations(checklist.hasEvidence),
      refresh: buildDecisionRefreshMetadata("initial_discovery", confidenceSummary.evidenceConfidence, now),
    },
    "Failed to build a schema-valid DecisionProfile."
  );
}
