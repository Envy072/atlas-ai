import type { DecisionProfile } from "@/lib/decision";
import type { VerificationSummary } from "@/lib/verification";
import DecisionSummaryPanel from "@/components/workspace/decision-report/DecisionSummaryPanel";
import TrustPanel from "@/components/workspace/decision-report/TrustPanel";

interface DecisionReportProps {
  profile: DecisionProfile;
  verification: VerificationSummary;
}

// Replaces AnalysisReport in the live flow (MILESTONE_14_DESIGN.md
// Section 20) — renders DecisionProfile and VerificationSummary in their
// own shapes rather than adapting them into the legacy AnalysisResult
// schema, which this milestone never touches. Trust renders before the
// Decision summary (MILESTONE_15_DESIGN.md Sections 5/11): a founder
// should see how much to trust a conclusion before reading it.
export default function DecisionReport({ profile, verification }: DecisionReportProps) {
  return (
    <div className="space-y-8">
      <TrustPanel verification={verification} />
      <DecisionSummaryPanel profile={profile} />
    </div>
  );
}
