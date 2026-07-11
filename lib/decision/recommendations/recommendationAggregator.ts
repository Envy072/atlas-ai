import type { Recommendation } from "@/lib/business";
import { dedupeByKey } from "@/lib/decision/utils/dedupeByKey";

const PRIORITY_ORDER: Record<Recommendation["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// Reuses lib/business's own Recommendation type directly (imported from
// its public barrel) — never redefined. Per this milestone's explicit
// rule ("Reuse Business Platform recommendations... Do NOT generate new
// recommendations"), this file only combines/orders recommendations a
// caller already has; it never decides what to recommend.
export function aggregateRecommendations(...recommendationLists: Recommendation[][]): Recommendation[] {
  return dedupeByKey(recommendationLists.flat(), (recommendation) => recommendation.id);
}

export function sortRecommendationsByPriority(recommendations: Recommendation[]): Recommendation[] {
  return [...recommendations].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}
