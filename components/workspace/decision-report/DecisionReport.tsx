import type { DecisionProfile, DecisionVerdict } from "@/lib/decision";
import type { VerificationSummary } from "@/lib/verification";
import DecisionSummaryPanel from "@/components/workspace/decision-report/DecisionSummaryPanel";
import TrustPanel from "@/components/workspace/decision-report/TrustPanel";
import MarketIntelligenceCard from "@/components/workspace/decision-report/MarketIntelligenceCard";
import CompetitorIntelligenceCard from "@/components/workspace/decision-report/CompetitorIntelligenceCard";
import BusinessIntelligenceCard from "@/components/workspace/decision-report/BusinessIntelligenceCard";
import FinancialIntelligenceCard from "@/components/workspace/decision-report/FinancialIntelligenceCard";

interface DecisionReportProps {
  profile: DecisionProfile;
  verification: VerificationSummary;
  verdict?: DecisionVerdict;
}

// Replaces AnalysisReport in the live flow (MILESTONE_14_DESIGN.md
// Section 20) — renders DecisionProfile and VerificationSummary in their
// own shapes rather than adapting them into the legacy AnalysisResult
// schema, which this milestone never touches.
//
// Canonical Decision Report ordering (MILESTONE_21/22/23_DESIGN.md
// "Canonical Decision Report Ordering" — a fixed conceptual sequence
// driven by information architecture, not implementation sequence, and
// not renumbered when a section doesn't exist yet). All four
// Intelligence platforms are now surfaced, completing the sequence:
//   Trust        — can I trust what follows?
//   Market       — is there a real opportunity here?
//   Competitors  — who else is already pursuing it?
//   Business     — given Market+Competitors, what's the business
//                   model/moat? (Milestone 23 — completes the Decision
//                   Report by surfacing already-validated BusinessProfile
//                   data that businessSummary/SWOT below only partially
//                   showed; a true, secondary consequence of this same
//                   work is that it also completes the four-platform
//                   Intelligence-card pattern.)
//   Financial    — does that business model work financially?
//   Decision Summary — Atlas AI's synthesized judgment, always last;
//                       still renders its own businessSummary/SWOT
//                       projection unchanged (one source, two
//                       projections, not a competing source of truth).
// Market before Competitor: competitive intelligence is only
// interpretable in light of market context (5 competitors means
// something different in a $50M SAM than a $50B SAM). Trust first and
// Decision Summary last are unchanged, established reasoning
// (MILESTONE_14/15_DESIGN.md): evidence precedes conclusions.
//
// `verdict` (Milestone 38, additive, optional) — the Final Verdict,
// computed by the caller via lib/decision's buildDecisionArtifacts()
// and forwarded here unchanged into DecisionSummaryPanel, which
// renders it as the last section of the whole report. `undefined` is
// an honest, legitimate state (nothing to assemble a verdict from yet,
// or generation degraded gracefully) — never coerced into a fabricated
// placeholder.
export default function DecisionReport({ profile, verification, verdict }: DecisionReportProps) {
  return (
    <div className="space-y-8">
      <TrustPanel verification={verification} />
      <MarketIntelligenceCard market={profile.marketProfile} />
      <CompetitorIntelligenceCard competitors={profile.keyCompetitors} />
      <BusinessIntelligenceCard business={profile.businessProfile} />
      <FinancialIntelligenceCard financial={profile.financialProfile} />
      <DecisionSummaryPanel profile={profile} verdict={verdict} />
    </div>
  );
}
