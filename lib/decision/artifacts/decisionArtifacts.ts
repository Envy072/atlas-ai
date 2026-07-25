import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { DecisionArtifacts } from "@/lib/decision/schemas/artifacts.schema";
import { deriveRecommendations } from "@/lib/decision/recommendations/recommendationGenerator";
import { deriveVerdict } from "@/lib/decision/verdict/decisionVerdict";

export type { DecisionArtifacts };

// The one shared computation point Resolution A (Principal Architect
// Review, Major Finding 1) requires: the only place application code
// calls deriveRecommendations() and deriveVerdict() together, so there
// is exactly one orchestration path, not several independently-written
// ones that could drift from each other (MILESTONE_38_DESIGN.md Section
// 5).
//
// Milestone 38's original Non-Goal deliberately left this function's
// result uncached, accepting model non-determinism as a known,
// documented limitation (Section 10 of that design). Milestone 115
// revisits that decision: two live OpenAI calls per session made a
// project's own verdict visibly disagree with itself between
// `/projects/{id}` and `/projects/{id}/memo` (Milestone 114's Critical
// Finding #2). This function itself is unchanged — still the one place
// both derive functions are called together — but it is now called
// exactly once per project, inside persistProjectFromSession()
// (lib/services/projects.ts), with the result persisted to
// Project.decisionArtifacts and read back by every route rather than
// recomputed by each.
//
// `DecisionArtifacts` is now a real schema
// (lib/decision/schemas/artifacts.schema.ts), not a plain interface —
// it's persisted and read back through parseOrThrow now, not just
// passed directly between two in-memory function calls in the same
// request.
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
