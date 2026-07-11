import type { PositioningFields } from "@/lib/business/types/synthesis";

// ARCHITECTURE ONLY. NEVER INVENT BUSINESS FACTS. Assessing a real
// competitive position (leader/challenger/follower/niche) or naming real
// competitive advantages requires product-differentiation data this
// platform doesn't have yet — it isn't derivable just from *how many*
// competitors the Competitor Platform found, since count alone says
// nothing about relative strength. Every field stays honestly
// absent/empty until a future module supplies real, evidenced input.
export function derivePositioning(): PositioningFields {
  return { competitiveAdvantages: [] };
}
