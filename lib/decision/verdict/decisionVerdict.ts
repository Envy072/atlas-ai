import type { Evidence } from "@/lib/research";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";
import type { InvestmentThesis } from "@/lib/decision/schemas/thesis.schema";
import type { DecisionConfidence } from "@/lib/decision/schemas/confidence.schema";
import type { Recommendation } from "@/lib/business";
import type { DecisionVerdict } from "@/lib/decision/schemas/verdict.schema";
import { DecisionVerdictSchema } from "@/lib/decision/schemas/verdict.schema";
import type { CandidateVerdict } from "@/lib/decision/schemas/candidateVerdict.schema";
import { parseOrThrow } from "@/lib/validation/parse";
import { verifyClaim, tallyClaimVerificationResults } from "@/lib/decision/traceability/claimVerifier";
import { generateCandidateVerdict } from "@/lib/services/openai";
import { computeCitableEvidence } from "@/lib/decision/evidence/citableEvidence";

export interface BuildDecisionVerdictInput {
  category: DecisionVerdict["category"];
  summary: string;
  confidence: number;
  supportingEvidence: Evidence[];
}

// The one place a real DecisionVerdict gets constructed — construction
// only, mirroring buildFinding()/buildRiskFinding()/
// buildInvestmentThesis()/buildRecommendation()'s own "construction
// only" precedent. Unlike those, DecisionVerdict has no id counter/
// Date.now()-based identity: it is not a member of a collection
// anything dedupes or looks up by id — exactly one exists per
// computation, consumed immediately by its caller
// (MILESTONE_38_DESIGN.md Section 5).
export function buildDecisionVerdict(input: BuildDecisionVerdictInput): DecisionVerdict {
  return parseOrThrow(DecisionVerdictSchema, { ...input }, "Failed to build a schema-valid DecisionVerdict.");
}

// Mechanically computed, never model-generated (MILESTONE_38_DESIGN.md
// Section 5, revised per Major Finding 2, Principal Architect Review).
// Mirrors lib/decision/confidence/decisionConfidence.ts's own
// computeEvidenceConfidence() shape exactly: the average
// Evidence.confidence of the verdict's own supportingEvidence — the
// real evidence its candidate actually cited and had verified — rather
// than a number read off a different artifact (the original,
// pre-review formula averaged Recommendation.confidence instead). The
// empty-supportingEvidence branch is defensive, not a real code path:
// Milestone 33's own rule (verifyClaimTraceability() rejects any claim
// with zero cited ids) guarantees resolvedEvidence is non-empty for
// every "matched" result, so this branch can never actually execute
// given how deriveVerdict() calls it below — kept anyway, mirroring
// computeEvidenceConfidence()'s own identical defensive check: a
// caller supplying an empty array by construction should never see a
// fabricated number.
export function computeVerdictConfidence(
  supportingEvidence: Evidence[],
  confidenceSummary: DecisionConfidence
): number {
  if (supportingEvidence.length === 0) return confidenceSummary.evidenceConfidence;
  const total = supportingEvidence.reduce((sum, item) => sum + item.confidence, 0);
  return Math.round(total / supportingEvidence.length);
}

// Real generation, evidence-constrained end to end
// (MILESTONE_38_DESIGN.md Section 5) — the fifth and last of the
// Checkpoint B/C generation functions, and (like deriveRecommendations())
// a second-order derivation rather than a synthesizeDecision()-time
// call: DecisionProfile has no `verdict` field, for the identical
// reason it has no `recommendations` field (Milestone 37's own
// confirmed finding). `recommendations` is a required input here,
// which is why deriveVerdict() cannot be called from
// synthesizeDecision() any more than deriveRecommendations() itself
// can — both are invoked on demand by lib/decision/artifacts/
// decisionArtifacts.ts's buildDecisionArtifacts(), this milestone's
// one shared computation point (Resolution A, Major Finding 1).
//
// Fail-closed exactly as Milestone 33 established, adapted to a
// singular (not array) output: Milestones 34-37 each drop a rejected
// candidate from an array, letting the rest of the array stand. Here
// there is exactly one candidate, so the identical rule ("a candidate
// with an unresolved citation is never partially accepted")
// necessarily means the entire verdict is dropped, returning
// `undefined` — never a placeholder verdict, never "verdict
// unavailable, but here's a guess anyway."
//
// Graceful degradation: a generation failure, a rejected citation, or
// nothing to assemble from all degrade to `undefined` — the caller (a
// route) renders an honest "Verdict not yet available" state, never a
// fabricated fallback.
export async function deriveVerdict(
  startupIdea: string,
  findings: Finding[],
  criticalRisks: RiskFinding[],
  investmentThesis: InvestmentThesis,
  recommendations: Recommendation[],
  confidenceSummary: DecisionConfidence
): Promise<DecisionVerdict | undefined> {
  // The recommendations.length === 0 clause is, given
  // deriveRecommendations()'s own identical guard, currently provably
  // implied by the other four checks (recommendations can never be
  // non-empty when findings/criticalRisks/every thesis array are all
  // empty). Kept anyway (Suggestion 8, Principal Architect Review): a
  // future caller of deriveVerdict() is not required to source
  // `recommendations` from deriveRecommendations() specifically, and
  // this function should stay correct even if one doesn't.
  const hasNothingToAssembleFrom =
    findings.length === 0 &&
    criticalRisks.length === 0 &&
    investmentThesis.positiveArguments.length === 0 &&
    investmentThesis.negativeArguments.length === 0 &&
    investmentThesis.unknowns.length === 0 &&
    investmentThesis.contradictions.length === 0 &&
    recommendations.length === 0;

  if (hasNothingToAssembleFrom) return undefined;

  const citableEvidence = computeCitableEvidence(findings, criticalRisks, investmentThesis);

  let candidate: CandidateVerdict;
  try {
    candidate = await generateCandidateVerdict(
      startupIdea,
      findings,
      criticalRisks,
      investmentThesis,
      recommendations,
      confidenceSummary,
      citableEvidence
    );
  } catch (error) {
    console.error("Verdict generation failed:", error);
    return undefined;
  }

  const verification = await verifyClaim(candidate, citableEvidence);
  console.info("[claimVerification]", { facet: "verdict", ...tallyClaimVerificationResults([verification]) });
  if (verification.status !== "matched") return undefined;

  return buildDecisionVerdict({
    category: candidate.category,
    summary: candidate.summary,
    confidence: computeVerdictConfidence(verification.resolvedEvidence, confidenceSummary),
    supportingEvidence: verification.resolvedEvidence,
  });
}
