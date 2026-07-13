import type { DecisionProfile } from "@/lib/decision";
import type { VerificationSummary } from "@/lib/verification";
import DecisionSummaryPanel from "@/components/workspace/decision-report/DecisionSummaryPanel";
import TrustPanel from "@/components/workspace/decision-report/TrustPanel";
import MarketIntelligenceCard from "@/components/workspace/decision-report/MarketIntelligenceCard";
import CompetitorIntelligenceCard from "@/components/workspace/decision-report/CompetitorIntelligenceCard";
import FinancialIntelligenceCard from "@/components/workspace/decision-report/FinancialIntelligenceCard";

interface DecisionReportProps {
  profile: DecisionProfile;
  verification: VerificationSummary;
}

// Replaces AnalysisReport in the live flow (MILESTONE_14_DESIGN.md
// Section 20) — renders DecisionProfile and VerificationSummary in their
// own shapes rather than adapting them into the legacy AnalysisResult
// schema, which this milestone never touches.
//
// Canonical Decision Report ordering (MILESTONE_21_DESIGN.md/
// MILESTONE_22_DESIGN.md "Canonical Decision Report Ordering" — a fixed
// conceptual sequence driven by information architecture, not
// implementation sequence, and not renumbered when a section doesn't
// exist yet):
//   Trust        — can I trust what follows?
//   Market       — is there a real opportunity here?
//   Competitors  — who else is already pursuing it?
//   Business     — (not yet built/scheduled) given Market+Competitors,
//                   what's the business model/moat? Its conceptual slot
//                   is simply omitted below, not filled or renumbered.
//   Financial    — does that business model work financially?
//   Decision Summary — Atlas AI's synthesized judgment, always last
// Market before Competitor: competitive intelligence is only
// interpretable in light of market context (5 competitors means
// something different in a $50M SAM than a $50B SAM). Trust first and
// Decision Summary last are unchanged, established reasoning
// (MILESTONE_14/15_DESIGN.md): evidence precedes conclusions.
export default function DecisionReport({ profile, verification }: DecisionReportProps) {
  return (
    <div className="space-y-8">
      <TrustPanel verification={verification} />
      <MarketIntelligenceCard market={profile.marketProfile} />
      <CompetitorIntelligenceCard competitors={profile.keyCompetitors} />
      <FinancialIntelligenceCard financial={profile.financialProfile} />
      <DecisionSummaryPanel profile={profile} />
    </div>
  );
}
