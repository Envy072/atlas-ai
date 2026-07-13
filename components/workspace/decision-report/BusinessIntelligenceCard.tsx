import { Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import StatCell from "@/components/shared/StatCell";
import TagList from "@/components/shared/TagList";
import EvidenceList from "@/components/shared/EvidenceList";
import { severityBadgeVariant } from "@/components/shared/severityTone";
import { formatPercent } from "@/lib/format";
import type {
  BusinessProfile,
  BusinessHealthRating,
  MoatType,
  ExecutionComplexityLevel,
} from "@/lib/business";

interface BusinessIntelligenceCardProps {
  business: BusinessProfile;
}

const HEALTH_LABEL: Record<BusinessHealthRating, string> = {
  strong: "Strong",
  stable: "Stable",
  fragile: "Fragile",
  critical: "Critical",
};

const MOAT_LABEL: Record<MoatType, string> = {
  network_effects: "Network effects",
  brand: "Brand",
  switching_costs: "Switching costs",
  economies_of_scale: "Economies of scale",
  proprietary_technology: "Proprietary technology",
  regulatory_advantage: "Regulatory advantage",
};

const COMPLEXITY_LABEL: Record<ExecutionComplexityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very high",
};

// Renders every field BusinessProfile already carries — no field is
// renamed, recomputed, or restructured; each value below reads directly
// off the same object Milestone 19's discoverBusiness() already
// produced (MILESTONE_23_DESIGN.md "Why no ViewModel..."). businessModel/
// valueProposition/customerProblem/competitivePosition/overallHealth
// appear here a second time, alongside DecisionSummaryPanel's own
// businessSummary — the same "one source, two projections" shape
// Milestone 19 established, not a competing source of truth
// (MILESTONE_23_DESIGN.md "Risks"). economicMoat.strengthScore renders as
// a plain stat, never a gauge/progress-bar — no field on BusinessProfile
// is a time series or a multi-point comparison
// (MILESTONE_23_DESIGN.md "Whether any visualization is justified").
export default function BusinessIntelligenceCard({ business }: BusinessIntelligenceCardProps) {
  const hasSegments = business.customerSegments.length > 0;
  const hasGrowthDrivers = business.growthDrivers.length > 0;
  const hasExpansionOpportunities = business.expansionOpportunities.length > 0;
  const hasDistributionChannels = business.distributionChannels.length > 0;
  const hasCompetitiveAdvantages = business.competitiveAdvantages.length > 0;
  const hasDependencies = business.keyDependencies.length > 0;
  const hasOperationalRisks = business.operationalRisks.length > 0;

  return (
    <Card className="space-y-6 p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <IconBadge icon={Briefcase} bgClassName="bg-blue-100" textClassName="text-blue-600" />
          <SectionHeader
            eyebrow="Business Intelligence"
            heading="What's the business model, and can it defend itself?"
            description={business.businessModel ?? business.valueProposition ?? "Business model not yet identified."}
          />
        </div>
        <StatCell label="Confidence" value={formatPercent(Math.round(business.confidence))} className="text-right" />
      </div>

      {business.customerProblem && (
        <p className="text-sm text-muted-foreground">{business.customerProblem}</p>
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <StatCell
          label="Overall health"
          value={business.overallHealth.rating ? HEALTH_LABEL[business.overallHealth.rating] : "Not yet assessed"}
          captions={business.overallHealth.rationale ? [{ text: business.overallHealth.rationale }] : []}
        />
        <StatCell
          label="Economic moat"
          value={business.economicMoat.type ? MOAT_LABEL[business.economicMoat.type] : "Not yet assessed"}
          captions={[
            ...(business.economicMoat.strengthScore !== undefined
              ? [{ text: `Strength: ${business.economicMoat.strengthScore}/100` }]
              : []),
            ...(business.economicMoat.rationale ? [{ text: business.economicMoat.rationale }] : []),
          ]}
        />
        <StatCell
          label="Execution complexity"
          value={business.executionComplexity ? COMPLEXITY_LABEL[business.executionComplexity] : "Not yet assessed"}
        />
        <StatCell label="Competitive position" value={business.competitivePosition ?? "Not yet assessed"} />
      </div>

      {(business.revenueStrategy || business.goToMarketStrategy || business.growthStrategy) && (
        <div className="space-y-3">
          {business.revenueStrategy && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revenue strategy</h3>
              <p className="text-sm text-muted-foreground">{business.revenueStrategy}</p>
            </div>
          )}
          {business.goToMarketStrategy && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">Go-to-market strategy</h3>
              <p className="text-sm text-muted-foreground">{business.goToMarketStrategy}</p>
            </div>
          )}
          {business.growthStrategy && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">Growth strategy</h3>
              <p className="text-sm text-muted-foreground">{business.growthStrategy}</p>
            </div>
          )}
        </div>
      )}

      {hasSegments && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Customer segments</h3>
          <ul className="space-y-2">
            {business.customerSegments.map((segment, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium text-foreground">{segment.name}</span>
                {segment.description && <p className="text-muted-foreground">{segment.description}</p>}
                {segment.painPoints.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {segment.painPoints.map((point, painIndex) => (
                      <li key={painIndex}>{point}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasDistributionChannels && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Distribution channels</h3>
          <TagList items={business.distributionChannels} />
        </div>
      )}

      {hasGrowthDrivers && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Growth drivers</h3>
          <TagList items={business.growthDrivers} />
        </div>
      )}

      {hasExpansionOpportunities && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Expansion opportunities</h3>
          <TagList items={business.expansionOpportunities} />
        </div>
      )}

      {hasCompetitiveAdvantages && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Competitive advantages</h3>
          <TagList items={business.competitiveAdvantages} />
        </div>
      )}

      {hasDependencies && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Key dependencies</h3>
          <ul className="space-y-2">
            {business.keyDependencies.map((dependency, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                {dependency.criticality && (
                  <Badge variant={severityBadgeVariant(dependency.criticality)}>{dependency.criticality}</Badge>
                )}
                <span className="font-medium text-foreground">{dependency.name}</span>
                {dependency.description && <span className="text-muted-foreground">— {dependency.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasOperationalRisks && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Operational risks</h3>
          <ul className="space-y-2">
            {business.operationalRisks.map((risk, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                {risk.severity && <Badge variant={severityBadgeVariant(risk.severity)}>{risk.severity}</Badge>}
                <span className="font-medium text-foreground">{risk.name}</span>
                {risk.description && <span className="text-muted-foreground">— {risk.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <EvidenceList evidence={business.evidence} />
    </Card>
  );
}
