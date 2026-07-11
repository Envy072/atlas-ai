import type { Source, Evidence } from "@/lib/research";
import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import { DecisionProfileSchema } from "@/lib/decision/schemas/decision.schema";
import type { DecisionContext } from "@/lib/decision/schemas/context.schema";
import type { BusinessSummary } from "@/lib/decision/schemas/businessSummary.schema";
import { deriveEmptyThesis } from "@/lib/decision/thesis/investmentThesis";
import { deriveFindings } from "@/lib/decision/findings/findingBuilder";
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
  sources?: Source[];
  evidence?: Evidence[];
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

  const findings = deriveFindings();
  const criticalRisks = deriveCriticalRisks();

  const checklist: CoverageChecklist = {
    hasBusinessModel: Boolean(input.businessSummary.businessModel),
    hasValueProposition: Boolean(input.businessSummary.valueProposition),
    hasCustomerProblem: Boolean(input.businessSummary.customerProblem),
    hasMarketIndustry: Boolean(input.decisionContext.marketIndustry),
    hasFundingStage: Boolean(input.decisionContext.fundingStage),
    hasFindings: findings.length > 0,
    hasCriticalRisks: criticalRisks.length > 0,
    hasEvidence: evidence.length > 0,
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
