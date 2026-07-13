import {
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import StatCell from "@/components/shared/StatCell";
import TagList from "@/components/shared/TagList";
import EvidenceList from "@/components/shared/EvidenceList";
import { severityBadgeVariant } from "@/components/shared/severityTone";
import { formatPercent, formatCurrencyUsd } from "@/lib/format";
import type {
  MarketProfile,
  MarketSizeEstimate,
  TrendDirection,
} from "@/lib/market";

interface MarketIntelligenceCardProps {
  market: MarketProfile;
}

const MATURITY_LABEL: Record<NonNullable<MarketProfile["marketMaturity"]>, string> = {
  emerging: "Emerging",
  growth: "Growth",
  mature: "Mature",
  declining: "Declining",
};

const TREND_ICON: Record<TrendDirection, LucideIcon> = {
  rising: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const TREND_ICON_CLASS: Record<TrendDirection, string> = {
  rising: "text-success",
  stable: "text-muted-foreground",
  declining: "text-destructive",
};

function sizeEstimateCaptions(estimate: MarketSizeEstimate) {
  const captions: Array<{ text: string; className?: string }> = [];
  if (estimate.asOfYear !== undefined) {
    captions.push({ text: `as of ${estimate.asOfYear}`, className: "mt-0.5 text-xs text-muted-foreground" });
  }
  if (estimate.methodology) {
    captions.push({ text: estimate.methodology });
  }
  return captions;
}

function SizeStat({ label, estimate }: { label: string; estimate: MarketSizeEstimate }) {
  return (
    <StatCell
      label={label}
      value={estimate.valueUsd !== undefined ? formatCurrencyUsd(estimate.valueUsd) : "Not yet known"}
      captions={sizeEstimateCaptions(estimate)}
    />
  );
}

// Renders every field MarketProfile already carries — no field is
// renamed, recomputed, or restructured; each value below reads directly
// off the same object Milestone 17's resolveMarketKnowledge() already
// produced (MILESTONE_21_DESIGN.md "Why no ViewModel..."). Growth is
// rendered as a single stat, never a chart — MarketGrowthRate is one
// CAGR/period pair, not a time series, so charting it would fabricate a
// trajectory that was never measured (MILESTONE_21_DESIGN.md "Knowledge
// vs Observation").
export default function MarketIntelligenceCard({ market }: MarketIntelligenceCardProps) {
  const isClassified = market.industry !== "unclassified";
  const hasGeography = market.geographicMarkets.length > 0;
  const hasRegulations = market.regulations.length > 0;
  const hasRisks = market.risks.length > 0;
  const hasTrends = market.trends.length > 0;
  const hasSegments = market.customerSegments.length > 0;

  return (
    <Card className="space-y-6 p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <IconBadge icon={Globe} bgClassName="bg-blue-100" textClassName="text-blue-600" />
          <SectionHeader
            eyebrow="Market Intelligence"
            heading="Is there a real opportunity here?"
            description={
              isClassified
                ? `${market.industry}${market.subIndustry ? ` — ${market.subIndustry}` : ""}`
                : "Industry not yet classified."
            }
          />
        </div>
        <div className="flex items-center gap-3">
          {market.marketMaturity && <Badge variant="outline">{MATURITY_LABEL[market.marketMaturity]}</Badge>}
          <StatCell label="Confidence" value={formatPercent(Math.round(market.confidence))} className="text-right" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <SizeStat label="TAM" estimate={market.sizing.tam} />
        <SizeStat label="SAM" estimate={market.sizing.sam} />
        <SizeStat label="SOM" estimate={market.sizing.som} />
        <StatCell
          label="Growth"
          value={market.growthRate?.cagrPercent !== undefined ? `${market.growthRate.cagrPercent}% CAGR` : "Not yet known"}
          captions={
            market.growthRate?.periodYears !== undefined
              ? [{ text: `over ${market.growthRate.periodYears}y`, className: "mt-0.5 text-xs text-muted-foreground" }]
              : []
          }
        />
      </div>

      {hasSegments && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground" /> Customer segments
          </h3>
          <ul className="space-y-2">
            {market.customerSegments.map((segment, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium text-foreground">{segment.name}</span>
                {segment.estimatedSizeUsd !== undefined && (
                  <span className="text-muted-foreground"> — {formatCurrencyUsd(segment.estimatedSizeUsd)}</span>
                )}
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

      {hasGeography && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Geographic markets
          </h3>
          <TagList
            items={market.geographicMarkets.map(
              (geo) =>
                `${geo.region}${geo.country ? ` (${geo.country})` : ""}${
                  geo.marketSizeUsd !== undefined ? ` — ${formatCurrencyUsd(geo.marketSizeUsd)}` : ""
                }`
            )}
          />
        </div>
      )}

      {hasTrends && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Market trends</h3>
          <ul className="space-y-2">
            {market.trends.map((trend, index) => {
              const TrendIcon = TREND_ICON[trend.direction];
              return (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <TrendIcon className={`mt-0.5 h-4 w-4 shrink-0 ${TREND_ICON_CLASS[trend.direction]}`} />
                  <span>
                    <span className="font-medium text-foreground">{trend.name}</span>
                    {trend.description && <span className="text-muted-foreground"> — {trend.description}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hasRegulations && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ScrollText className="h-3.5 w-3.5 text-muted-foreground" /> Regulations
          </h3>
          <ul className="space-y-2">
            {market.regulations.map((regulation, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                {regulation.severity && (
                  <Badge variant={severityBadgeVariant(regulation.severity)}>{regulation.severity}</Badge>
                )}
                <span className="font-medium text-foreground">{regulation.name}</span>
                {regulation.jurisdiction && (
                  <span className="text-xs text-muted-foreground">({regulation.jurisdiction})</span>
                )}
                {regulation.description && <span className="text-muted-foreground">— {regulation.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasRisks && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> Market risks
          </h3>
          <ul className="space-y-2">
            {market.risks.map((risk, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                {risk.severity && <Badge variant={severityBadgeVariant(risk.severity)}>{risk.severity}</Badge>}
                <span className="font-medium text-foreground">{risk.name}</span>
                {risk.description && <span className="text-muted-foreground">— {risk.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <EvidenceList evidence={market.evidence} />
    </Card>
  );
}
