import { StatusPill } from "@/components/ui/status-pill";
import { formatRelativeTime } from "@/lib/format";

interface StaleAnalysisBadgeProps {
  isStale: boolean;
  lastUpdated: string;
}

// The one, honest re-validation nudge (MILESTONE_41_DESIGN.md) — a
// presentational guard only, never a staleness decision. `isStale` is
// computed exclusively by isDecisionStale() (lib/decision/refresh,
// unmodified since Milestone 31) in app/projects/[id]/page.tsx; this
// component never re-derives or second-guesses that value from
// `lastUpdated` or any other field. Reuses StatusPill (tone "info" —
// nothing is broken, the analysis is simply aging) and formatRelativeTime,
// both already used elsewhere on this exact page, rather than
// introducing a new indicator pattern.
export default function StaleAnalysisBadge({ isStale, lastUpdated }: StaleAnalysisBadgeProps) {
  if (!isStale) return null;

  return (
    <div className="flex items-center gap-2">
      <StatusPill label="Stale analysis" tone="info" />
      <span className="text-xs text-muted-foreground">
        Last updated {formatRelativeTime(lastUpdated)} — market conditions may have changed since then.
      </span>
    </div>
  );
}
