import { Users, Globe, ThumbsUp, ThumbsDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";
import EmptyState from "@/components/shared/EmptyState";
import { formatPercent } from "@/lib/format";
import type { CompanyProfile, CompetitorCategory } from "@/lib/competitors";

interface CompetitorIntelligenceCardProps {
  competitors: CompanyProfile[];
}

const CATEGORY_LABEL: Record<CompetitorCategory, string> = {
  direct: "Direct",
  indirect: "Indirect",
  adjacent: "Adjacent",
  aspirational: "Aspirational",
};

function StringList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

// Renders every field CompanyProfile already carries — no field is
// renamed, recomputed, or restructured; each value below reads directly
// off the same object Milestone 16's resolveCompetitorKnowledge() already
// produced (MILESTONE_20_DESIGN.md Section 9). Evidence is shown at the
// company level, matching the schema exactly: CompanyProfileSchema has no
// per-strength/per-weakness evidence link, only one evidence list for the
// whole profile, so this never fabricates a more granular pairing than
// the data actually supports.
function CompetitorSubCard({ competitor }: { competitor: CompanyProfile }) {
  const hasPricing = Boolean(competitor.pricing);
  const hasStrengthsOrWeaknesses = competitor.strengths.length > 0 || competitor.weaknesses.length > 0;

  return (
    <div className="rounded-2xl border border-border p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">{competitor.name}</h3>
            {competitor.category && (
              <Badge variant="outline">{CATEGORY_LABEL[competitor.category]}</Badge>
            )}
          </div>
          {competitor.aliases.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Also known as: {competitor.aliases.join(", ")}
            </p>
          )}
          {competitor.description && (
            <p className="mt-2 text-sm text-muted-foreground">{competitor.description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Confidence</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatPercent(Math.round(competitor.confidence))}</p>
        </div>
      </div>

      {competitor.website && (
        <a
          href={competitor.website}
          target="_blank"
          rel="noreferrer"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          {competitor.website}
        </a>
      )}

      {hasPricing && (
        <div className="mb-4">
          <h4 className="mb-1.5 text-sm font-semibold text-foreground">Pricing</h4>
          {competitor.pricing?.model && (
            <p className="mb-1 text-sm text-muted-foreground">{competitor.pricing.model}</p>
          )}
          {competitor.pricing && competitor.pricing.tiers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {competitor.pricing.tiers.map((tier, index) => (
                <Badge key={index} variant="secondary">
                  {tier.name}
                  {tier.priceUsd !== undefined ? ` — $${tier.priceUsd}` : ""}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {competitor.features.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-1.5 text-sm font-semibold text-foreground">Features</h4>
          <div className="flex flex-wrap gap-2">
            {competitor.features.map((feature, index) => (
              <Badge key={index} variant="outline">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasStrengthsOrWeaknesses && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ThumbsUp className="h-3.5 w-3.5 text-success" /> Strengths
            </h4>
            {competitor.strengths.length > 0 ? (
              <StringList items={competitor.strengths} />
            ) : (
              <p className="text-sm text-muted-foreground">None identified yet.</p>
            )}
          </div>
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ThumbsDown className="h-3.5 w-3.5 text-destructive" /> Weaknesses
            </h4>
            {competitor.weaknesses.length > 0 ? (
              <StringList items={competitor.weaknesses} />
            ) : (
              <p className="text-sm text-muted-foreground">None identified yet.</p>
            )}
          </div>
        </div>
      )}

      {competitor.evidence.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-sm font-semibold text-foreground">Evidence</h4>
          <ul className="space-y-1 border-l border-border pl-3">
            {competitor.evidence.map((evidence) => (
              <li key={evidence.id} className="text-xs text-muted-foreground">
                {evidence.evidence}{" "}
                <a href={evidence.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  (source)
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Renders DecisionProfile.keyCompetitors — the real, resolved CompanyProfile
// records Milestone 16 already accumulates. Every field comes directly off
// CompanyProfile; nothing here is a second representation of that schema
// (MILESTONE_20_DESIGN.md Section 9/Definition of Done).
export default function CompetitorIntelligenceCard({ competitors }: CompetitorIntelligenceCardProps) {
  return (
    <Card className="space-y-6 p-7">
      <div className="flex items-center gap-4">
        <IconBadge icon={Users} bgClassName="bg-blue-100" textClassName="text-blue-600" />
        <SectionHeader
          eyebrow="Competitor Intelligence"
          heading="Who else is building this?"
          description={
            competitors.length > 0
              ? `${competitors.length} competitor${competitors.length === 1 ? "" : "s"} identified.`
              : undefined
          }
        />
      </div>

      {competitors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No competitors identified yet"
          description="This is expected without a configured search-provider in this environment — not an error."
        />
      ) : (
        <div className="space-y-4">
          {competitors.map((competitor) => (
            <CompetitorSubCard key={competitor.id} competitor={competitor} />
          ))}
        </div>
      )}
    </Card>
  );
}
