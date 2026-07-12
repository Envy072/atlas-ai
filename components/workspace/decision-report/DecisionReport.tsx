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
// schema, which this milestone never touches.
export default function DecisionReport({ profile, verification }: DecisionReportProps) {
  return (
    <div className="space-y-8">
      <DecisionSummaryPanel profile={profile} />
      <TrustPanel verification={verification} />
    </div>
  );
}
