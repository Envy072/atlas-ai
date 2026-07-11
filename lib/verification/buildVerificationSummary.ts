import type { DecisionProfile, Finding, RiskFinding } from "@/lib/decision";
import { parseOrThrow } from "@/lib/validation/parse";
import { VerificationSummarySchema } from "@/lib/verification/schemas/verification.schema";
import type { VerificationSummary, VerifiedClaim } from "@/lib/verification/schemas/verification.schema";

function findingToVerifiedClaim(finding: Finding): VerifiedClaim {
  return {
    kind: "finding",
    category: finding.category,
    severityLabel: finding.severity,
    summary: finding.summary,
    evidence: finding.evidence,
    confidence: finding.confidence,
  };
}

function riskFindingToVerifiedClaim(risk: RiskFinding): VerifiedClaim {
  return {
    kind: "critical_risk",
    category: risk.category,
    severityLabel: risk.severity,
    summary: risk.summary,
    evidence: risk.evidence,
    confidence: risk.confidence,
  };
}

function countUniqueDomains(sources: DecisionProfile["sources"]): number {
  return new Set(sources.map((source) => source.domain)).size;
}

// Builds a VerificationSummary from an already-complete DecisionProfile
// (MILESTONE_13_DESIGN.md Section 6) — every field is a direct
// pass-through or a simple count over data Decision Intelligence already
// computed. Never gathers new evidence, never recomputes confidence,
// never generates a new Finding or RiskFinding.
export function buildVerificationSummary(profile: DecisionProfile): VerificationSummary {
  const verifiedFindings = profile.keyFindings.filter((finding) => finding.evidence.length > 0);
  const verifiedClaims: VerifiedClaim[] = [
    ...verifiedFindings.map(findingToVerifiedClaim),
    ...profile.criticalRisks.map(riskFindingToVerifiedClaim),
  ];

  const unverifiedStatements = [...profile.decisionLimitations, ...profile.openQuestions];

  const verifiedCount = verifiedClaims.length;
  const unverifiedCount = unverifiedStatements.length;
  const totalStatements = verifiedCount + unverifiedCount;
  const verifiedRatio = totalStatements > 0 ? verifiedCount / totalStatements : 0;

  return parseOrThrow(
    VerificationSummarySchema,
    {
      confidence: profile.confidenceSummary,
      sources: profile.sources,
      sourceBreakdown: {
        totalSources: profile.sources.length,
        uniqueDomains: countUniqueDomains(profile.sources),
      },
      verifiedClaims,
      unverifiedStatements,
      verificationCounts: {
        verifiedCount,
        unverifiedCount,
        verifiedRatio,
      },
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid VerificationSummary."
  );
}
