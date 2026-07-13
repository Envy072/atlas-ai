import { Badge } from "@/components/ui/badge";

interface TagListProps {
  items: string[];
  variant?: "outline" | "secondary";
}

// The recurring "flex-wrap list of Badges built from already-formatted
// labels" pattern — matches BusinessIntelligenceCard's own
// already-correct local StringBadgeList shape exactly
// (MILESTONE_24_DESIGN.md "TagList — recommend extraction"). Every call
// site formats its own structured data into a plain label string before
// calling this component; no generic "item renderer" prop is introduced.
// `variant="secondary"` preserves CompetitorIntelligenceCard's own
// pricing-tier badges, which use a different tone than every other tag
// list's default "outline" — a real, pre-existing distinction preserved,
// not unified away.
export default function TagList({ items, variant = "outline" }: TagListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <Badge key={index} variant={variant}>
          {item}
        </Badge>
      ))}
    </div>
  );
}
