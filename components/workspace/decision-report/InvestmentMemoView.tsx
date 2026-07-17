import { Briefcase, TrendingUp, TrendingDown, HelpCircle, ListChecks, Gavel } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import StringList from "@/components/shared/StringList";
import StatCell from "@/components/shared/StatCell";
import EvidenceList from "@/components/shared/EvidenceList";
import EmptyState from "@/components/shared/EmptyState";
import { severityBadgeVariant } from "@/components/shared/severityTone";
import { formatPercent } from "@/lib/format";
import type { InvestmentMemo } from "@/lib/decision";
import type { ReadinessAssessment, ReadinessLevel, VerdictCategory } from "@/lib/decision";

interface InvestmentMemoViewProps {
  memo: InvestmentMemo;
}

const VERDICT_LABEL: Record<VerdictCategory, string> = {
  pursue: "Pursue",
  pursue_with_conditions: "Pursue, with conditions",
  monitor: "Monitor",
  pass: "Pass",
};

const VERDICT_BADGE_VARIANT: Record<VerdictCategory, "success" | "warning" | "info" | "destructive"> = {
  pursue: "success",
  pursue_with_conditions: "warning",
  monitor: "info",
  pass: "destructive",
};

const READINESS_DIMENSIONS: Array<{ key: keyof InvestmentMemo["decisionReadiness"]; label: string }> = [
  { key: "investment", label: "Investment" },
  { key: "funding", label: "Funding" },
  { key: "expansion", label: "Expansion" },
  { key: "operational", label: "Operational" },
  { key: "technology", label: "Technology" },
];

const READINESS_LABEL: Record<ReadinessLevel, string> = {
  not_ready: "Not ready",
  emerging: "Emerging",
  ready: "Ready",
  strong: "Strong",
};

// One small, local (not shared/promoted — used exactly once, below the
// "three repetitions" threshold, MILESTONE_31_DESIGN.md Section 5.3)
// treatment for a single ReadinessAssessment dimension. No component in
// this codebase has ever rendered DecisionReadiness before this one
// (confirmed by direct read of DecisionSummaryPanel.tsx, which renders
// every other DecisionProfile field except this one).
function ReadinessRow({ label, assessment }: { label: string; assessment: ReadinessAssessment }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {assessment.rationale && <p className="mt-0.5 text-xs text-muted-foreground">{assessment.rationale}</p>}
      </div>
      <Badge variant={assessment.level ? "secondary" : "outline"}>
        {assessment.level ? READINESS_LABEL[assessment.level] : "Not yet assessed"}
      </Badge>
    </div>
  );
}

// Renders InvestmentMemo exactly as lib/decision produced it — every
// value here is a direct pass-through; no new selection, generation, or
// confidence math happens in this component. investmentThesis/
// keyFindings/criticalRisks render the same underlying facts
// DecisionSummaryPanel already shows, laid out for a memo reader
// (MILESTONE_31_DESIGN.md Deliverable 5). recommendations shows an
// honest empty state when `memo.recommendations` is empty — as of
// Milestone 38, `app/projects/[id]/memo/page.tsx` calls
// buildDecisionArtifacts() before building the memo, so a real,
// evidence-traceable list renders whenever Decision Intelligence
// produced one; an empty list still means exactly what it always
// did — nothing real to recommend yet, never a fabricated one.
// `verdict` (Milestone 38, additive, optional) renders the same way:
// an honest empty state when `undefined`, never a placeholder.
export default function InvestmentMemoView({ memo }: InvestmentMemoViewProps) {
  const {
    businessSummary,
    investmentThesis,
    keyFindings,
    criticalRisks,
    recommendations,
    decisionReadiness,
    confidenceSummary,
    verdict,
  } = memo;

  return (
    <Card className="space-y-8 p-7">
      <div className="flex items-center gap-4">
        <IconBadge icon={Briefcase} bgClassName="bg-blue-100" textClassName="text-blue-600" />
        <SectionHeader
          eyebrow="Investment Memo"
          heading="The case for this decision"
          description={businessSummary.valueProposition ?? businessSummary.businessModel}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <StatCell
          label="Evidence confidence"
          value={formatPercent(Math.round(confidenceSummary.evidenceConfidence))}
          size="lg"
        />
        <StatCell label="Coverage" value={formatPercent(Math.round(confidenceSummary.coverage))} size="lg" />
        <StatCell label="Unknown" value={formatPercent(Math.round(confidenceSummary.unknownPercentage))} size="lg" />
        <StatCell
          label="Data freshness"
          value={confidenceSummary.dataFreshnessDays !== undefined ? `${Math.round(confidenceSummary.dataFreshnessDays)}d` : "—"}
          size="lg"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-3">
          <IconBadge icon={Gavel} bgClassName="bg-indigo-100" textClassName="text-indigo-600" size="sm" />
          <h3 className="text-sm font-semibold text-foreground">Final verdict</h3>
        </div>
        {verdict ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={VERDICT_BADGE_VARIANT[verdict.category]}>{VERDICT_LABEL[verdict.category]}</Badge>
              <Badge variant="outline">{formatPercent(verdict.confidence)} confidence</Badge>
            </div>
            <p className="text-sm leading-7 text-foreground">{verdict.summary}</p>
            <EvidenceList evidence={verdict.supportingEvidence} heading="Supporting evidence" headingTag="h4" />
          </div>
        ) : (
          <EmptyState
            icon={Gavel}
            title="Verdict not yet available"
            description="Not enough real, evidence-backed material to assemble a verdict from yet — an honest absence, not a broken feature."
          />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Investment thesis</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-success" /> Positive arguments
            </h4>
            <StringList items={investmentThesis.positiveArguments} empty="None identified yet." spacing="normal" />
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingDown className="h-4 w-4 text-destructive" /> Negative arguments
            </h4>
            <StringList items={investmentThesis.negativeArguments} empty="None identified yet." spacing="normal" />
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <HelpCircle className="h-4 w-4 text-muted-foreground" /> Unknowns
            </h4>
            <StringList items={investmentThesis.unknowns} empty="None recorded." spacing="normal" />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Contradictions</h4>
            <StringList items={investmentThesis.contradictions} empty="None found." spacing="normal" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Key findings</h3>
        {keyFindings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings yet.</p>
        ) : (
          <ul className="space-y-4">
            {keyFindings.map((finding) => (
              <li key={finding.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{finding.category}</Badge>
                  <Badge variant={severityBadgeVariant(finding.severity)}>{finding.severity}</Badge>
                </div>
                <p className="text-sm text-foreground">{finding.summary}</p>
                {finding.evidence.length > 0 ? (
                  <EvidenceList evidence={finding.evidence} headingTag="h4" />
                ) : (
                  <p className="text-xs text-muted-foreground">No supporting evidence recorded.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Critical risks</h3>
        {criticalRisks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No critical risks flagged yet.</p>
        ) : (
          <ul className="space-y-4">
            {criticalRisks.map((risk) => (
              <li key={risk.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{risk.category}</Badge>
                  <Badge variant={severityBadgeVariant(risk.severity)}>{risk.severity}</Badge>
                </div>
                <p className="text-sm text-foreground">{risk.summary}</p>
                <EvidenceList evidence={risk.evidence} headingTag="h4" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Recommendations</h3>
        {recommendations.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No recommendations yet"
            description="Not enough real, evidence-backed material to assemble a recommendation from yet — an honest absence, not a broken feature."
          />
        ) : (
          <ul className="space-y-2">
            {recommendations.map((recommendation) => (
              <li key={recommendation.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{recommendation.category}</Badge>
                <Badge variant="outline">{recommendation.priority}</Badge>
                <span className="text-foreground">{recommendation.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Decision readiness</h3>
        <div>
          {READINESS_DIMENSIONS.map(({ key, label }) => (
            <ReadinessRow key={key} label={label} assessment={decisionReadiness[key]} />
          ))}
        </div>
      </div>
    </Card>
  );
}
