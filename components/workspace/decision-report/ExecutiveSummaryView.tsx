import { ClipboardList, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import StringList from "@/components/shared/StringList";
import StatCell from "@/components/shared/StatCell";
import EvidenceList from "@/components/shared/EvidenceList";
import { severityBadgeVariant } from "@/components/shared/severityTone";
import { formatPercent } from "@/lib/format";
import type { ExecutiveSummary } from "@/lib/decision";

interface ExecutiveSummaryViewProps {
  summary: ExecutiveSummary;
}

// Renders ExecutiveSummary exactly as lib/decision produced it — every
// value here is a direct pass-through; no new selection or confidence
// math happens in this component. NOT a duplicate of
// DecisionSummaryPanel: that component renders DecisionProfile's full,
// unsliced strengths/weaknesses/findings; this one renders
// ExecutiveSummary's own top-N selection of the same underlying facts,
// for a reader who wants a scannable summary, not the full dashboard
// (MILESTONE_31_DESIGN.md Deliverable 4).
export default function ExecutiveSummaryView({ summary }: ExecutiveSummaryViewProps) {
  const { businessSummary, topStrengths, topWeaknesses, topFindings, criticalRiskCount, confidenceSummary } = summary;

  return (
    <Card className="space-y-8 p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <IconBadge icon={ClipboardList} bgClassName="bg-blue-100" textClassName="text-blue-600" />
          <SectionHeader
            eyebrow="Decision Intelligence"
            heading="What matters most"
            description={businessSummary.valueProposition ?? businessSummary.businessModel}
          />
        </div>
        <StatCell label="Critical risks" value={String(criticalRiskCount)} className="text-right" />
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

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-success" /> Top strengths
          </h3>
          <StringList items={topStrengths} empty="None recorded yet." spacing="normal" />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <TrendingDown className="h-4 w-4 text-destructive" /> Top weaknesses
          </h3>
          <StringList items={topWeaknesses} empty="None recorded yet." spacing="normal" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Top findings</h3>
        {topFindings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings yet.</p>
        ) : (
          <ul className="space-y-4">
            {topFindings.map((finding) => (
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
    </Card>
  );
}
