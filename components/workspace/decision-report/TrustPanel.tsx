import { ShieldCheck, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import { formatPercent, formatRelativeTime } from "@/lib/format";
import type { VerificationSummary } from "@/lib/verification";

interface TrustPanelProps {
  verification: VerificationSummary;
}

function ConfidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// Reserved for "actually needs attention" states elsewhere
// (SessionProgressExperience) — thin/zero evidence here is an honest,
// expected outcome in this environment (no search-provider credentials
// configured), never an error, so it never borrows a destructive tone
// (MILESTONE_15_DESIGN.md's UX Principle 5).
function trustTone(verifiedRatio: number): { label: string; tone: "success" | "warning" | "neutral" } {
  if (verifiedRatio >= 0.7) return { label: "Well verified", tone: "success" };
  if (verifiedRatio > 0) return { label: "Partially verified", tone: "warning" };
  return { label: "Limited verification", tone: "neutral" };
}

// Renders VerificationSummary exactly as lib/verification produced it —
// sources, per-claim evidence, and the four confidence dimensions.
// Every value here is a direct pass-through; no new classification or
// confidence math happens in this component (MILESTONE_14_DESIGN.md
// Section 8/20). Sources render as a real Table (MILESTONE_15_DESIGN.md
// Section 9) — the first live consumer of a primitive that existed,
// built, and unused since DESIGN_SYSTEM.md's own milestone.
export default function TrustPanel({ verification }: TrustPanelProps) {
  const { confidence, sources, sourceBreakdown, verifiedClaims, unverifiedStatements, verificationCounts } =
    verification;
  const tone = trustTone(verificationCounts.verifiedRatio);

  return (
    <Card className="space-y-8 p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <IconBadge icon={ShieldCheck} bgClassName="bg-blue-100" textClassName="text-blue-600" />
          <SectionHeader
            eyebrow="Trust & Evidence"
            heading="How much of this can you trust?"
            description={`${verificationCounts.verifiedCount} verified claim${
              verificationCounts.verifiedCount === 1 ? "" : "s"
            } out of ${verificationCounts.verifiedCount + verificationCounts.unverifiedCount} (${formatPercent(
              Math.round(verificationCounts.verifiedRatio * 100)
            )}).`}
          />
        </div>
        <StatusPill label={tone.label} tone={tone.tone} />
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <ConfidenceStat label="Evidence confidence" value={formatPercent(Math.round(confidence.evidenceConfidence))} />
        <ConfidenceStat label="Coverage" value={formatPercent(Math.round(confidence.coverage))} />
        <ConfidenceStat label="Unknown" value={formatPercent(Math.round(confidence.unknownPercentage))} />
        <ConfidenceStat
          label="Data freshness"
          value={confidence.dataFreshnessDays !== undefined ? `${Math.round(confidence.dataFreshnessDays)}d` : "—"}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Sources ({sourceBreakdown.totalSources}, {sourceBreakdown.uniqueDomains} unique domains)
        </h3>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources are attached to this analysis yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Retrieved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {source.title || source.domain}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{source.domain}</TableCell>
                  <TableCell>{formatPercent(Math.round(source.confidence))}</TableCell>
                  <TableCell className="text-muted-foreground">{formatRelativeTime(source.retrievedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Verified claims</h3>
        {verifiedClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claims are backed by evidence yet.</p>
        ) : (
          <ul className="space-y-4">
            {verifiedClaims.map((claim, index) => (
              <li key={`${claim.kind}-${index}`} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={claim.kind === "critical_risk" ? "destructive" : "outline"}>
                    {claim.kind === "critical_risk" ? "Critical risk" : "Finding"}
                  </Badge>
                  <Badge variant="secondary">{claim.category}</Badge>
                  <Badge variant="outline">{claim.severityLabel}</Badge>
                </div>
                <p className="text-sm text-foreground">{claim.summary}</p>
                <ul className="ml-4 space-y-1 border-l border-border pl-3">
                  {claim.evidence.map((evidence) => (
                    <li key={evidence.id} className="text-xs text-muted-foreground">
                      {evidence.evidence}{" "}
                      <a href={evidence.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        (source)
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          Unverified / assumed
        </h3>
        {unverifiedStatements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is flagged as unverified.</p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {unverifiedStatements.map((statement, index) => (
              <li key={index}>{statement}</li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
