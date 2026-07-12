import { Lightbulb, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import type { DecisionProfile } from "@/lib/decision";

interface DecisionSummaryPanelProps {
  profile: DecisionProfile;
}

function StringList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

// Renders DecisionProfile's own synthesized material — investment thesis
// arguments, findings, and critical risks — exactly as lib/decision
// produced it. Deliberately shows no verdict/score: investmentThesis
// carries no conclusion field by its own design ("no generated
// conclusion" — MILESTONE_14_DESIGN.md Section 4/16), only the raw
// arguments a person weighs themselves.
export default function DecisionSummaryPanel({ profile }: DecisionSummaryPanelProps) {
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
          <StringList items={investmentThesis.positiveArguments} empty="None identified yet." />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <TrendingDown className="h-4 w-4 text-destructive" /> Negative arguments
          </h3>
          <StringList items={investmentThesis.negativeArguments} empty="None identified yet." />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <HelpCircle className="h-4 w-4 text-muted-foreground" /> Unknowns
          </h3>
          <StringList items={investmentThesis.unknowns} empty="None recorded." />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Contradictions</h3>
          <StringList items={investmentThesis.contradictions} empty="None found." />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Strengths</h3>
          <StringList items={strengths} empty="None recorded yet." />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Weaknesses</h3>
          <StringList items={weaknesses} empty="None recorded yet." />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Opportunities</h3>
          <StringList items={opportunities} empty="None recorded yet." />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Threats</h3>
          <StringList items={threats} empty="None recorded yet." />
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
                <Badge variant="secondary">{finding.severity}</Badge>
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
                <Badge variant="destructive">{risk.severity}</Badge>
                <Badge variant="outline">{risk.category}</Badge>
                <span className="text-foreground">{risk.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
