import { Lightbulb, TrendingUp, TrendingDown, HelpCircle, Gavel } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import StringList from "@/components/shared/StringList";
import { severityBadgeVariant } from "@/components/shared/severityTone";
import { formatPercent } from "@/lib/format";
import type { DecisionProfile, DecisionVerdict, VerdictCategory } from "@/lib/decision";

interface DecisionSummaryPanelProps {
  profile: DecisionProfile;
  verdict?: DecisionVerdict;
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

// Renders DecisionProfile's own synthesized material — investment thesis
// arguments, findings, and critical risks — exactly as lib/decision
// produced it. `verdict` (Milestone 38, additive, optional) is Atlas
// AI's own Final Verdict — a real conclusion, mechanically confidence-
// scored and evidence-traceable, computed by the caller via
// lib/decision's buildDecisionArtifacts() and rendered here as this
// panel's own last section (this file no longer shows "no
// verdict/score": investmentThesis itself still carries no conclusion
// field by its own design — "no generated conclusion" —
// MILESTONE_14_DESIGN.md Section 4/16 — but the verdict is a distinct,
// separately-computed artifact that DOES conclude, sitting alongside
// the raw arguments a person can still weigh themselves). `undefined`
// is an honest, legitimate state, rendered plainly, never a fabricated
// placeholder.
export default function DecisionSummaryPanel({ profile, verdict }: DecisionSummaryPanelProps) {
  const { businessSummary, investmentThesis, keyFindings, criticalRisks, strengths, weaknesses, opportunities, threats } =
    profile;

  return (
    <Card className="space-y-8 p-7">
      <div className="flex items-center gap-4">
        <IconBadge icon={Lightbulb} bgClassName="bg-indigo-100" textClassName="text-indigo-600" />
        <SectionHeader
          eyebrow="Decision Intelligence"
          heading="What was synthesized"
          description={businessSummary.valueProposition ?? businessSummary.businessModel}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-success" /> Positive arguments
          </h3>
          <StringList items={investmentThesis.positiveArguments} empty="None identified yet." spacing="normal" />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <TrendingDown className="h-4 w-4 text-destructive" /> Negative arguments
          </h3>
          <StringList items={investmentThesis.negativeArguments} empty="None identified yet." spacing="normal" />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <HelpCircle className="h-4 w-4 text-muted-foreground" /> Unknowns
          </h3>
          <StringList items={investmentThesis.unknowns} empty="None recorded." spacing="normal" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Contradictions</h3>
          <StringList items={investmentThesis.contradictions} empty="None found." spacing="normal" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Strengths</h3>
          <StringList items={strengths} empty="None recorded yet." spacing="normal" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Weaknesses</h3>
          <StringList items={weaknesses} empty="None recorded yet." spacing="normal" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Opportunities</h3>
          <StringList items={opportunities} empty="None recorded yet." spacing="normal" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Threats</h3>
          <StringList items={threats} empty="None recorded yet." spacing="normal" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Key findings</h3>
        {keyFindings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings yet.</p>
        ) : (
          <ul className="space-y-2">
            {keyFindings.map((finding) => (
              <li key={finding.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{finding.category}</Badge>
                <Badge variant={severityBadgeVariant(finding.severity)}>{finding.severity}</Badge>
                <span className="text-foreground">{finding.summary}</span>
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
          <ul className="space-y-2">
            {criticalRisks.map((risk) => (
              <li key={risk.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{risk.category}</Badge>
                <Badge variant={severityBadgeVariant(risk.severity)}>{risk.severity}</Badge>
                <span className="text-foreground">{risk.summary}</span>
              </li>
            ))}
          </ul>
        )}
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
              <Badge variant="outline">
                {verdict.supportingEvidence.length} supporting {verdict.supportingEvidence.length === 1 ? "source" : "sources"}
              </Badge>
            </div>
            <p className="text-sm leading-7 text-foreground">{verdict.summary}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not yet available — not enough real, evidence-backed material to assemble a verdict from yet.
          </p>
        )}
      </div>
    </Card>
  );
}
