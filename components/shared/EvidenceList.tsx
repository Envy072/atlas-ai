import type { Evidence } from "@/lib/research";

interface EvidenceListProps {
  evidence: Evidence[];
  heading?: string;
  headingTag?: "h3" | "h4";
}

const HEADING_CLASS: Record<NonNullable<EvidenceListProps["headingTag"]>, string> = {
  h3: "mb-2 text-sm font-semibold text-foreground",
  h4: "mb-1.5 text-sm font-semibold text-foreground",
};

// The standalone "Evidence" section repeated across
// MarketIntelligenceCard, CompetitorIntelligenceCard,
// BusinessIntelligenceCard, and FinancialIntelligenceCard
// (MILESTONE_24_DESIGN.md's cross-card audit). Renders nothing when
// empty — the caller no longer needs its own `hasEvidence` conditional.
// `headingTag="h4"` preserves CompetitorIntelligenceCard's own
// pre-existing distinction — its Evidence section is nested inside a
// per-company sub-card alongside sibling h4 headings (Pricing,
// Features, Strengths, Weaknesses), unlike the other three cards' own
// top-level h3 sections — found during implementation's rendered-HTML
// verification, not caught during design. Deliberately NOT used by
// TrustPanel's own nested, per-claim evidence list, which is
// structurally different (nested inside a claim's own <li>, with an
// extra ml-4 wrapper and no standalone heading) — forcing it into this
// shape would require an unjustified wrapper-override prop
// (MILESTONE_24_DESIGN.md "EvidenceList — recommend extraction").
export default function EvidenceList({ evidence, heading = "Evidence", headingTag = "h3" }: EvidenceListProps) {
  if (evidence.length === 0) return null;

  const Heading = headingTag;

  return (
    <div>
      <Heading className={HEADING_CLASS[headingTag]}>{heading}</Heading>
      <ul className="space-y-1 border-l border-border pl-3">
        {evidence.map((item) => (
          <li key={item.id} className="text-xs text-muted-foreground">
            {item.evidence}{" "}
            <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              (source)
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
