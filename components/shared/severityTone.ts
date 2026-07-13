// A single, honest severity→tone mapping — generalizes
// DecisionSummaryPanel's own pre-existing function (Milestone 15,
// predates every Intelligence card) rather than the narrower 3-entry
// SEVERITY_TONE Record independently duplicated, byte-identical, in
// MarketIntelligenceCard, FinancialIntelligenceCard, and
// BusinessIntelligenceCard (MILESTONE_24_DESIGN.md's cross-card audit).
// Safely handles both Finding's three-level Severity ("low"/"medium"/
// "high") and RiskFinding's four-level RedFlagSeverity (adds
// "critical") via string comparison rather than a Record keyed to one
// specific enum type.
export function severityBadgeVariant(severity: string): "destructive" | "warning" | "secondary" {
  if (severity === "critical" || severity === "high") return "destructive";
  if (severity === "medium") return "warning";
  return "secondary";
}
