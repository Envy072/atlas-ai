import type { Project } from "@/lib/schemas/project";
import { formatPercent, formatDate, formatCurrencyUsd, getBusinessSummaryHeadline } from "@/lib/format";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

interface ProjectComparisonViewProps {
  left: Project;
  right: Project;
}

const MAX_LIST_ITEMS = 3;

function ListCell({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">None recorded.</span>;
  }

  return (
    <ul className="list-disc space-y-0.5 pl-4">
      {items.slice(0, MAX_LIST_ITEMS).map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function marketHeadline(profile: Project["profile"]): string {
  const { industry, sizing } = profile.marketProfile;
  const tam = sizing.tam.valueUsd;
  return tam !== undefined ? `${industry} — ${formatCurrencyUsd(tam)} TAM` : `${industry} — Market size not yet known.`;
}

// Compares only already-persisted data on the two Project rows
// (Milestone 49) — no verdict, no recommendations, no fresh generation
// of any kind: those are second-order, on-demand derivations
// (buildDecisionArtifacts(), Milestone 38), never a Project field, and
// triggering them here for two projects at once would mean two fresh,
// costly LLM calls on every page view, exactly what this milestone's
// own scope excludes.
export default function ProjectComparisonView({ left, right }: ProjectComparisonViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" />
          <TableHead scope="col">{left.title}</TableHead>
          <TableHead scope="col">{right.title}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">Created</TableHead>
          <TableCell>{formatDate(left.createdAt)}</TableCell>
          <TableCell>{formatDate(right.createdAt)}</TableCell>
        </TableRow>

        <TableRow>
          <TableHead scope="row">Evidence Confidence</TableHead>
          <TableCell>{formatPercent(Math.round(left.profile.confidenceSummary.evidenceConfidence))}</TableCell>
          <TableCell>{formatPercent(Math.round(right.profile.confidenceSummary.evidenceConfidence))}</TableCell>
        </TableRow>

        <TableRow>
          <TableHead scope="row">Verified Claims</TableHead>
          <TableCell>
            {left.verification.verificationCounts.verifiedCount} of{" "}
            {left.verification.verificationCounts.verifiedCount + left.verification.verificationCounts.unverifiedCount}
          </TableCell>
          <TableCell>
            {right.verification.verificationCounts.verifiedCount} of{" "}
            {right.verification.verificationCounts.verifiedCount +
              right.verification.verificationCounts.unverifiedCount}
          </TableCell>
        </TableRow>

        <TableRow>
          <TableHead scope="row">Business Summary</TableHead>
          <TableCell>{getBusinessSummaryHeadline(left.profile.businessSummary)}</TableCell>
          <TableCell>{getBusinessSummaryHeadline(right.profile.businessSummary)}</TableCell>
        </TableRow>

        <TableRow>
          <TableHead scope="row">Top Strengths</TableHead>
          <TableCell>
            <ListCell items={left.profile.strengths} />
          </TableCell>
          <TableCell>
            <ListCell items={right.profile.strengths} />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableHead scope="row">Top Risks</TableHead>
          <TableCell>
            <ListCell items={left.profile.criticalRisks.map((risk) => risk.summary)} />
          </TableCell>
          <TableCell>
            <ListCell items={right.profile.criticalRisks.map((risk) => risk.summary)} />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableHead scope="row">Market</TableHead>
          <TableCell>{marketHeadline(left.profile)}</TableCell>
          <TableCell>{marketHeadline(right.profile)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
