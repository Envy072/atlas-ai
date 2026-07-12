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
  // Milestone 16, additive — real competitor knowledge (at least one
  // resolved CompanyProfile) is now a distinct coverage signal, directly
  // tying richer competitor intelligence to a measurable confidence
  // change (MILESTONE_16_DESIGN.md Section 7).
  hasCompetitorProfiles: boolean;
  // Milestone 17, additive — a real, classified market (not merely
  // attempted) is a distinct coverage signal, directly tying richer
  // market intelligence to a measurable confidence change
  // (MILESTONE_17_DESIGN.md Section 12).
  hasMarketProfile: boolean;
}
