import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { Recommendation } from "@/lib/business";
import type { DecisionVerdict } from "@/lib/decision/schemas/verdict.schema";
import { deriveRecommendations } from "@/lib/decision/recommendations/recommendationGenerator";
import { deriveVerdict } from "@/lib/decision/verdict/decisionVerdict";

export interface DecisionArtifacts {
  recommendations: Recommendation[];
  verdict: DecisionVerdict | undefined;
}

// The one shared computation point Resolution A (Principal Architect
// Review, Major Finding 1) requires: the only place application code
// calls deriveRecommendations() and deriveVerdict() together — both
// routes that need either one call this function instead of calling
// the two derive functions themselves, so there is exactly one
// orchestration path, not two independently-written ones that could
// drift from each other (MILESTONE_38_DESIGN.md Section 5).
//
// This does NOT make two separate HTTP requests to two different
// routes produce byte-identical output — that would require
// persisting or caching a result across requests, which is explicitly
// out of scope (Section 3 Non-Goals). What it does guarantee: within
// any single call, recommendations are derived first, the verdict is
// derived from those same recommendations (never a second,
// independently generated list), and every caller reaches both
// artifacts through identical logic, identical argument order, and
// identical error handling — removing accidental drift as a source of
// inconsistency, even though model non-determinism as a source of
// inconsistency remains (Section 10).
//
// `DecisionArtifacts` is a new, small, additive type — not a schema
// (no z.object), since nothing persists or validates this shape
// beyond what Recommendation[]/DecisionVerdict | undefined (both
// already schema-typed individually) already guarantee. It exists
// only to give this function's own return value a name, mirroring how
// DecisionSynthesisResult names synthesizeDecision()'s own return
// shape.
export async function buildDecisionArtifacts(profile: DecisionProfile): Promise<DecisionArtifacts> {
  const recommendations = await deriveRecommendations(
    profile.decisionContext.startupIdea,
    profile.keyFindings,
    profile.criticalRisks,
    profile.investmentThesis
  );

  const verdict = await deriveVerdict(
    profile.decisionContext.startupIdea,
    profile.keyFindings,
    profile.criticalRisks,
    profile.investmentThesis,
    recommendations,
    profile.confidenceSummary
  );

  return { recommendations, verdict };
}
