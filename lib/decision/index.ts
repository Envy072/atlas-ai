// Public entry point for the Decision Intelligence Platform. Every future
// consumer this milestone anticipates (Investor Reports, Due Diligence,
// Investment Memo, Executive Summary, Funding Readiness, Acquisition
// Review, Bank Lending Assessment, Accelerator Evaluation — see
// DECISION_PLATFORM.md's Future Consumers) should import from here,
// never from a deep path into a specific subfolder — the same discipline
// every prior platform's public barrel enforces for itself.
export { buildDecisionProfile } from "@/lib/decision/engine/decisionProfileBuilder";
export { mergeDecisionProfile } from "@/lib/decision/engine/profileMerger";
export { synthesizeDecision } from "@/lib/decision/engine/decisionEngine";

export {
  buildInvestmentThesis,
  deriveEmptyThesis,
  deriveInvestmentThesis,
} from "@/lib/decision/thesis/investmentThesis";
export { buildFinding, deriveFindings } from "@/lib/decision/findings/findingBuilder";
export { buildRiskFinding, deriveCriticalRisks } from "@/lib/decision/redflags/riskFinding";

export { aggregateEvidence } from "@/lib/decision/evidence/evidenceAggregator";
export { verifyClaimTraceability } from "@/lib/decision/traceability/claimVerifier";
export { computeDecisionConfidence } from "@/lib/decision/confidence/decisionConfidence";

export {
  buildReadinessAssessment,
  deriveDecisionReadiness,
} from "@/lib/decision/readiness/decisionReadiness";
export {
  aggregateRecommendations,
  sortRecommendationsByPriority,
} from "@/lib/decision/recommendations/recommendationAggregator";
export { deriveRecommendations } from "@/lib/decision/recommendations/recommendationGenerator";

export {
  buildDecisionVerdict,
  deriveVerdict,
} from "@/lib/decision/verdict/decisionVerdict";
export { buildDecisionArtifacts } from "@/lib/decision/artifacts/decisionArtifacts";

export { buildInvestmentMemo } from "@/lib/decision/memo/investmentMemo";
export { buildDueDiligenceReport } from "@/lib/decision/diligence/dueDiligenceReport";
export { buildExecutiveSummary } from "@/lib/decision/executive/executiveSummary";

export {
  requestManualRefresh,
  requestScheduledRefresh,
  requestStaleRefresh,
  collectStaleDecisions,
} from "@/lib/decision/refresh/decisionRefreshEngine";
export { isDecisionStale } from "@/lib/decision/refresh/decisionRefreshPolicy";

export { createStore } from "@/lib/decision/storage/createStore";
export { MemoryDecisionStore } from "@/lib/decision/storage/memoryStore";

export * from "@/lib/decision/schemas";
export * from "@/lib/decision/types";
