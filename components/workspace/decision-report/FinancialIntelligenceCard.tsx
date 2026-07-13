import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import StatCell from "@/components/shared/StatCell";
import TagList from "@/components/shared/TagList";
import StringList from "@/components/shared/StringList";
import EvidenceList from "@/components/shared/EvidenceList";
import { severityBadgeVariant } from "@/components/shared/severityTone";
import { formatPercent, formatCurrencyUsd } from "@/lib/format";
import type { FinancialProfile, FinancialEstimate } from "@/lib/financial";

interface FinancialIntelligenceCardProps {
  financial: FinancialProfile;
}

// Formats a FinancialEstimate's value using the unit it was actually
// recorded with — never a hardcoded per-field assumption, since the same
// FinancialEstimate shape is reused across very differently-denominated
// metrics (MILESTONE_22_DESIGN.md "Which financial values should be
// rendered as KPI/stat cards"). Absent value renders as an honest
// "Not yet known", never a fabricated placeholder like 0.
function formatEstimateValue(estimate: FinancialEstimate): string {
  if (estimate.value === undefined) return "Not yet known";

  switch (estimate.unit) {
    case "percent":
      return formatPercent(Math.round(estimate.value));
    case "usd":
      return formatCurrencyUsd(estimate.value);
    case "usd_per_month":
      return `${formatCurrencyUsd(estimate.value)}/mo`;
    case "months":
      return `${estimate.value} mo`;
    case "ratio":
      return `${estimate.value}x`;
    default:
      return `${estimate.value}`;
  }
}

// Now uses the shared StatCell primitive (MILESTONE_24_DESIGN.md) —
// previously a local, near-identical copy of TrustPanel.ConfidenceStat/
// MarketIntelligenceCard.SizeStat, deliberately left local at Milestone
// 22 pending the cross-card review that milestone's own design
// document requested.
function FinancialStat({ label, estimate }: { label: string; estimate: FinancialEstimate }) {
  return (
    <StatCell
      label={label}
      value={formatEstimateValue(estimate)}
      captions={estimate.methodology ? [{ text: estimate.methodology }] : []}
    />
  );
}

// Renders every field FinancialProfile already carries — no field is
// renamed, recomputed, or restructured; each value below reads directly
// off the same object Milestone 18's discoverFinancials() already
// produced (MILESTONE_22_DESIGN.md "Why no ViewModel..."). ltvToCac is
// rendered with the same FinancialStat treatment as every other
// estimate — no special "verified" styling — since the honesty is in
// the content ("Not yet known" vs. a real number), not a new visual
// hierarchy invented for the one genuinely composed value
// (MILESTONE_22_DESIGN.md "Risks"). No chart, sparkline, or scenario
// comparison anywhere: no field on FinancialProfile is a time series,
// and even a same-instant comparison chart would misrepresent ten
// honestly-absent estimates as "small" rather than "unknown"
// (MILESTONE_22_DESIGN.md "Whether any charts would be truthful today").
export default function FinancialIntelligenceCard({ financial }: FinancialIntelligenceCardProps) {
  const hasRevenueStreams = financial.revenueStreams.length > 0;
  const hasExpenses = financial.expenses.length > 0;
  const hasRisks = financial.financialRisks.length > 0;
  const hasAssumptions = financial.financialAssumptions.length > 0;

  return (
    <Card className="space-y-6 p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <IconBadge icon={DollarSign} bgClassName="bg-blue-100" textClassName="text-blue-600" />
          <SectionHeader
            eyebrow="Financial Intelligence"
            heading="Does the business model work financially?"
            description={
              financial.revenueModel
                ? `${financial.revenueModel}${financial.pricingStrategy?.model ? ` — ${financial.pricingStrategy.model}` : ""}`
                : "Revenue model not yet identified."
            }
          />
        </div>
        <div className="flex items-center gap-3">
          {financial.fundingStage && <Badge variant="outline">{financial.fundingStage.replace(/_/g, " ")}</Badge>}
          <StatCell label="Confidence" value={formatPercent(Math.round(financial.confidence))} className="text-right" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <FinancialStat label="MRR" estimate={financial.mrr} />
        <FinancialStat label="ARR" estimate={financial.arr} />
        <FinancialStat label="Gross margin" estimate={financial.grossMargin} />
        <FinancialStat label="Operating margin" estimate={financial.operatingMargin} />
        <FinancialStat label="CAC" estimate={financial.cac} />
        <FinancialStat label="LTV" estimate={financial.ltv} />
        <FinancialStat label="LTV : CAC" estimate={financial.ltvToCac} />
        <FinancialStat label="Burn rate" estimate={financial.burnRate} />
        <FinancialStat label="Runway" estimate={financial.runway} />
        <FinancialStat label="Break-even" estimate={financial.breakEven} />
        <FinancialStat label="Payback period" estimate={financial.paybackPeriod} />
        {financial.costStructure?.fixedCostsUsdPerMonth !== undefined && (
          <StatCell label="Fixed costs" value={`${formatCurrencyUsd(financial.costStructure.fixedCostsUsdPerMonth)}/mo`} />
        )}
        {financial.costStructure?.variableCostsUsdPerMonth !== undefined && (
          <StatCell
            label="Variable costs"
            value={`${formatCurrencyUsd(financial.costStructure.variableCostsUsdPerMonth)}/mo`}
          />
        )}
      </div>

      {hasAssumptions && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Revenue assumptions</h3>
          <StringList items={financial.financialAssumptions} spacing="tight" />
        </div>
      )}

      {hasRevenueStreams && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Revenue streams</h3>
          <TagList
            items={financial.revenueStreams.map(
              (stream) =>
                `${stream.name}${stream.estimatedMonthlyUsd !== undefined ? ` — ${formatCurrencyUsd(stream.estimatedMonthlyUsd)}/mo` : ""}`
            )}
          />
        </div>
      )}

      {hasExpenses && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Expenses</h3>
          <TagList
            items={financial.expenses.map(
              (expense) =>
                `${expense.name}${expense.estimatedMonthlyUsd !== undefined ? ` — ${formatCurrencyUsd(expense.estimatedMonthlyUsd)}/mo` : ""}`
            )}
          />
        </div>
      )}

      {hasRisks && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Financial risks</h3>
          <ul className="space-y-2">
            {financial.financialRisks.map((risk, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                {risk.severity && <Badge variant={severityBadgeVariant(risk.severity)}>{risk.severity}</Badge>}
                <Badge variant="secondary">{risk.category}</Badge>
                <span className="font-medium text-foreground">{risk.name}</span>
                {risk.description && <span className="text-muted-foreground">— {risk.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <EvidenceList evidence={financial.evidence} />
    </Card>
  );
}
