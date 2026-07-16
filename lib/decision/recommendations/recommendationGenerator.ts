import type { Evidence } from "@/lib/research";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";
import type { InvestmentThesis } from "@/lib/decision/schemas/thesis.schema";
import type { Recommendation } from "@/lib/business";
import { buildRecommendation } from "@/lib/business";
import { sortRecommendationsByPriority } from "@/lib/decision/recommendations/recommendationAggregator";
import { verifyClaimTraceability } from "@/lib/decision/traceability/claimVerifier";
import { generateCandidateRecommendations } from "@/lib/services/openai";
import type { CandidateRecommendation } from "@/lib/decision/schemas/candidateRecommendation.schema";
import { dedupeByKey } from "@/lib/decision/utils/dedupeByKey";

// Restricted, already-verified citable-evidence pool — the union of
// evidence already cited by keyFindings, criticalRisks, and
// investmentThesis.supportingEvidence, deduplicated by id
// (MILESTONE_37_DESIGN.md Section 5, Option B). A recommendation can
// only cite evidence some other already-verified facet already
// touched — a deliberate, stronger traceability guarantee than the
// raw aggregated pool Milestones 34-36 each use, accepted as an
// intentional trade-off (Section 10): a real, non-fabricated
// recommendation citing evidence outside this pool is still rejected.
function computeCitableEvidence(
  findings: Finding[],
  criticalRisks: RiskFinding[],
  investmentThesis: InvestmentThesis
): Evidence[] {
  const allEvidence = [
    ...findings.flatMap((finding) => finding.evidence),
    ...criticalRisks.flatMap((risk) => risk.evidence),
    ...investmentThesis.supportingEvidence,
  ];
  return dedupeByKey(allEvidence, (item) => item.id);
}

// Real generation, evidence-constrained end to end
// (MILESTONE_37_DESIGN.md Section 5) — the fourth and last of the four
// Checkpoint B generation functions, and the only one that is a
// second-order derivation rather than a synthesizeDecision()-time
// call: DecisionProfile has no `recommendations` field (Section 4.1),
// so this function reads an already-built profile's own keyFindings/
// criticalRisks/investmentThesis directly, for whichever
// artifact-builder needs real recommendations (today,
// buildInvestmentMemo()'s already-existing, already-shaped second
// parameter — unchanged by this milestone).
//
// Every candidate generateCandidateRecommendations() returns is
// checked by verifyClaimTraceability() (Milestone 33, unmodified)
// against the restricted citable pool above — a candidate that fails
// is dropped entirely, never shown with a caveat (ATLAS_AI_V2_FINAL.md
// Section 5). lib/business's own, unmodified buildRecommendation()
// constructs the real Recommendation for every "matched" result;
// requiredEvidence is populated with the real, verified evidence ids
// the candidate's citations resolved to (see recommendation.schema.ts's
// own comment for this convention). The final list is sorted by
// priority via Decision Intelligence's own existing, until-now-untested
// sortRecommendationsByPriority() before returning.
//
// Graceful degradation: a generation failure, or nothing to recommend
// from (findings, criticalRisks, and every investmentThesis array all
// empty), degrades to [] rather than failing whichever artifact-build
// this function is called from.
export async function deriveRecommendations(
  startupIdea: string,
  findings: Finding[],
  criticalRisks: RiskFinding[],
  investmentThesis: InvestmentThesis
): Promise<Recommendation[]> {
  const hasNothingToRecommendFrom =
    findings.length === 0 &&
    criticalRisks.length === 0 &&
    investmentThesis.positiveArguments.length === 0 &&
    investmentThesis.negativeArguments.length === 0 &&
    investmentThesis.unknowns.length === 0 &&
    investmentThesis.contradictions.length === 0;

  if (hasNothingToRecommendFrom) return [];

  const citableEvidence = computeCitableEvidence(findings, criticalRisks, investmentThesis);

  let candidates: CandidateRecommendation[];
  try {
    candidates = await generateCandidateRecommendations(
      startupIdea,
      findings,
      criticalRisks,
      investmentThesis,
      citableEvidence
    );
  } catch (error) {
    console.error("Recommendation generation failed:", error);
    return [];
  }

  const recommendations: Recommendation[] = [];
  for (const candidate of candidates) {
    const verification = verifyClaimTraceability(candidate, citableEvidence);
    if (verification.status !== "matched") continue;

    recommendations.push(
      buildRecommendation({
        category: candidate.category,
        priority: candidate.priority,
        reason: candidate.summary,
        requiredEvidence: verification.resolvedEvidence.map((item) => item.id),
        confidence: candidate.confidence,
      })
    );
  }

  return sortRecommendationsByPriority(recommendations);
}
