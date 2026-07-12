import type { DecisionProfile } from "@/lib/decision";
import type { VerificationSummary } from "@/lib/verification";
import DecisionSummaryPanel from "@/components/workspace/decision-report/DecisionSummaryPanel";
import TrustPanel from "@/components/workspace/decision-report/TrustPanel";
import MarketIntelligenceCard from "@/components/workspace/decision-report/MarketIntelligenceCard";
import CompetitorIntelligenceCard from "@/components/workspace/decision-report/CompetitorIntelligenceCard";

interface DecisionReportProps {
  profile: DecisionProfile;
  verification: VerificationSummary;
}

// Replaces AnalysisReport in the live flow (MILESTONE_14_DESIGN.md
// Section 20) — renders DecisionProfile and VerificationSummary in their
// own shapes rather than adapting them into the legacy AnalysisResult
// schema, which this milestone never touches.
//
// Canonical Decision Report ordering (MILESTONE_21_DESIGN.md "Canonical
// Decision Report Ordering" — binding for all future Intelligence
// cards, not an implementation accident):
//   1. TrustPanel                        — can I trust what follows?
//   2. MarketIntelligenceCard            — is there a real opportunity here?
//   3. CompetitorIntelligenceCard        — who else is already pursuing it?
//   4. BusinessIntelligenceCard (future) — given 2+3, what's the business model/moat?
//   5. FinancialIntelligenceCard (future)— does that business model work financially?
//   6. DecisionSummaryPanel              — Atlas AI's synthesized judgment
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
      <DecisionSummaryPanel profile={profile} />
    </div>
  );
}
