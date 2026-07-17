import { FileSearch, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import EvidenceList from "@/components/shared/EvidenceList";
import EmptyState from "@/components/shared/EmptyState";
import { severityBadgeVariant } from "@/components/shared/severityTone";
import type { DueDiligenceReport } from "@/lib/decision";

interface DueDiligenceReportViewProps {
  report: DueDiligenceReport;
}

// The eight named sections, in DECISION_PLATFORM.md's own documented
// order (Business, Market, Competition, Financial, Operations,
// Technology, Legal, Execution). One shared icon (FileSearch) is used
// for every section's empty state rather than inventing eight
// thematically-distinct icons with no functional purpose beyond
// decoration — the section's own heading text already names the
// category (MILESTONE_31_DESIGN.md's own "avoid unnecessary
// abstraction" discipline, applied here to icon choice, not just code).
const SECTIONS: Array<{ key: keyof Pick<DueDiligenceReport, "business" | "market" | "competition" | "financial" | "operations" | "technology" | "legal" | "execution">; label: string }> = [
  { key: "business", label: "Business" },
  { key: "market", label: "Market" },
  { key: "competition", label: "Competition" },
  { key: "financial", label: "Financial" },
  { key: "operations", label: "Operations" },
  { key: "technology", label: "Technology" },
  { key: "legal", label: "Legal" },
  { key: "execution", label: "Execution" },
];

// Renders DueDiligenceReport exactly as lib/decision produced it — no
// new grouping, filtering, or generated text happens in this
// component. A section with zero categorized findings is a real,
// expected state (Finding objects don't exist yet at all in this
// environment without real search-provider credentials) — rendered as
// an honest empty state, never a fabricated placeholder
// (MILESTONE_31_DESIGN.md Deliverable 6).
export default function DueDiligenceReportView({ report }: DueDiligenceReportViewProps) {
  return (
    <Card className="space-y-8 p-7">
      <div className="flex items-center gap-4">
        <IconBadge icon={FileSearch} bgClassName="bg-blue-100" textClassName="text-blue-600" />
        <SectionHeader
          eyebrow="Due Diligence Report"
          heading="Every domain, examined"
          description="Findings grouped by domain, backed by their own evidence — nothing generated, only what was actually found."
        />
      </div>

      {SECTIONS.map(({ key, label }) => {
        const section = report[key];

        return (
          <div key={key}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">{label}</h3>
            {section.summary && <p className="mb-3 text-sm text-muted-foreground">{section.summary}</p>}
            {section.findings.length === 0 ? (
              <EmptyState
                icon={FileSearch}
                title={`No ${label.toLowerCase()} findings yet`}
                description="This is expected without a configured search-provider in this environment — not an error."
              />
            ) : (
              <ul className="space-y-4">
                {section.findings.map((finding) => (
                  <li key={finding.id} className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
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
        );
      })}

      <EvidenceList evidence={report.evidence} heading="Evidence" headingTag="h3" />

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          Unknowns
        </h3>
        {report.unknowns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is flagged as unknown.</p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {report.unknowns.map((unknown, index) => (
              <li key={index}>{unknown}</li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
