import type { BusinessHealth } from "@/lib/business/schemas/health.schema";

// ARCHITECTURE ONLY. NEVER INVENT BUSINESS FACTS. `rating` deliberately
// stays absent rather than being derived from how much data this platform
// happens to have (e.g. from `confidence`) — how *complete* a profile is
// and how *healthy* the business actually is are different questions, and
// conflating them (a data-poor business isn't necessarily unhealthy, nor
// is a data-rich one necessarily healthy) would be exactly the dishonest
// shortcut this milestone prohibits. A real rating requires the scoring
// engine's real dimension scores (scoring/scoringDimensions.ts), which
// are themselves architecture-only placeholders today.
export function deriveOverallHealth(): BusinessHealth {
  return {
    rationale:
      "Overall health assessment requires real scoring-dimension data (see scoring/) — not yet computed.",
  };
}
