import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { ExecutiveSummary } from "@/lib/decision/schemas/executive.schema";
import { ExecutiveSummarySchema } from "@/lib/decision/schemas/executive.schema";
import { parseOrThrow } from "@/lib/validation/parse";

const SEVERITY_ORDER: Record<Finding["severity"], number> = { high: 0, medium: 1, low: 2 };

function topFindings(findings: Finding[], maxItems: number): Finding[] {
  return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).slice(0, maxItems);
}

const DEFAULT_MAX_ITEMS = 3;

// Reshapes an already-built DecisionProfile into the Executive Summary
// consumer's expected shape — "No generated text" means every field here
// is a real SELECTION (a slice of existing strengths/weaknesses, the
// highest-severity findings, a count of critical risks), never newly-
// written prose.
export function buildExecutiveSummary(
  profile: DecisionProfile,
  maxItems: number = DEFAULT_MAX_ITEMS
): ExecutiveSummary {
  return parseOrThrow(
    ExecutiveSummarySchema,
    {
      decisionContext: profile.decisionContext,
      businessSummary: profile.businessSummary,
      topStrengths: profile.strengths.slice(0, maxItems),
      topWeaknesses: profile.weaknesses.slice(0, maxItems),
      topFindings: topFindings(profile.keyFindings, maxItems),
      criticalRiskCount: profile.criticalRisks.length,
      confidenceSummary: profile.confidenceSummary,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid ExecutiveSummary."
  );
}
