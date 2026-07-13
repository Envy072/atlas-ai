interface StatCellCaption {
  text: string;
  className?: string;
}

interface StatCellProps {
  label: string;
  value: string;
  captions?: StatCellCaption[];
  size?: "md" | "lg";
  className?: string;
}

const VALUE_SIZE_CLASS: Record<NonNullable<StatCellProps["size"]>, string> = {
  md: "text-xl",
  lg: "text-2xl",
};

// The recurring "uppercase label / bold value / optional caption(s)"
// stat pattern used throughout the Decision Report (TrustPanel's
// ConfidenceStat, MarketIntelligenceCard's SizeStat, FinancialIntelligenceCard's
// FinancialStat, and every card's own inline Confidence stat —
// MILESTONE_24_DESIGN.md's cross-card audit). `size="lg"` preserves
// TrustPanel's own pre-existing text-2xl (every other caller uses the
// default "md"/text-xl) — a real, pre-existing inconsistency this
// extraction preserves rather than silently unifies. Each caption's
// className is caller-supplied (defaulting to "mt-1 text-xs
// text-muted-foreground") so call sites needing MarketIntelligenceCard's
// own "mt-0.5" first-caption spacing can reproduce it exactly.
// `className` is applied to this component's own root element — several
// header "Confidence" stats were previously hand-wrapped in their own
// `<div className="text-right">`; passing `className="text-right"` here
// lets that wrapper be StatCell's own root div instead of an additional
// one, preserving the original, unnested DOM shape exactly (caught by
// MILESTONE_24_DESIGN.md's own rendered-HTML verification requirement).
export default function StatCell({ label, value, captions = [], size = "md", className }: StatCellProps) {
  return (
    <div className={className}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={`mt-1 ${VALUE_SIZE_CLASS[size]} font-bold text-foreground`}>{value}</p>
      {captions.map((caption, index) => (
        <p key={index} className={caption.className ?? "mt-1 text-xs text-muted-foreground"}>
          {caption.text}
        </p>
      ))}
    </div>
  );
}
