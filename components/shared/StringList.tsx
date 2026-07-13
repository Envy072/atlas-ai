interface StringListProps {
  items: string[];
  empty?: string;
  spacing?: "tight" | "normal";
}

const SPACING_CLASS: Record<NonNullable<StringListProps["spacing"]>, string> = {
  tight: "space-y-1",
  normal: "space-y-1.5",
};

// The recurring plain bulleted string list with an optional empty-state
// fallback message (DecisionSummaryPanel's own StringList,
// CompetitorIntelligenceCard's own StringList, FinancialIntelligenceCard's
// inline, un-extracted equivalent — MILESTONE_24_DESIGN.md's cross-card
// audit). `spacing` preserves a real, pre-existing inconsistency found
// during that audit: DecisionSummaryPanel uses "space-y-1.5"
// ("normal"), while Competitor/Financial use "space-y-1" ("tight") —
// callers must pass the spacing that matches their own file's prior
// rendered output, never assume a single default is safe. When `empty`
// is omitted and `items` is empty, renders nothing (matching
// FinancialIntelligenceCard's own always-non-empty call site, which
// relies on an outer conditional instead).
export default function StringList({ items, empty, spacing = "tight" }: StringListProps) {
  if (items.length === 0) {
    return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  }

  return (
    <ul className={`list-disc ${SPACING_CLASS[spacing]} pl-5 text-sm text-foreground`}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
