// What confidence/decisionConfidence.ts's computeDecisionConfidence()
// needs to compute `coverage`/`unknownPercentage` — a plain, non-schema
// checklist of presence/absence facts about an in-progress
// DecisionProfile. Not a Zod-validated shape (never crosses a boundary
// itself; only its numeric output does).
export interface CoverageChecklist {
  hasBusinessModel: boolean;
  hasValueProposition: boolean;
  hasCustomerProblem: boolean;
  hasMarketIndustry: boolean;
  hasFundingStage: boolean;
  hasFindings: boolean;
  hasCriticalRisks: boolean;
  hasEvidence: boolean;
}
