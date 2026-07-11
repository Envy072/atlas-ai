import type { ReadinessAssessment, DecisionReadiness } from "@/lib/decision/schemas/readiness.schema";
import { ReadinessAssessmentSchema } from "@/lib/decision/schemas/readiness.schema";
import type { ReadinessLevel } from "@/lib/decision/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildReadinessAssessmentInput {
  level?: ReadinessLevel;
  rationale?: string;
}

// The one place a real ReadinessAssessment gets constructed — for a
// future caller with a real, evidenced verdict.
export function buildReadinessAssessment(input: BuildReadinessAssessmentInput): ReadinessAssessment {
  return parseOrThrow(
    ReadinessAssessmentSchema,
    { level: input.level, rationale: input.rationale },
    "Failed to build a schema-valid ReadinessAssessment."
  );
}

const UNASSESSED_RATIONALE =
  "Requires real dimension scores from the Business/Financial/Market/Competitor Platforms' own scoring engines, which are themselves architecture-only placeholders today — not yet assessed.";

function unassessed(): ReadinessAssessment {
  return { rationale: UNASSESSED_RATIONALE };
}

// ARCHITECTURE ONLY. NO FAKE SCORES. Every dimension's `level` stays
// absent rather than derived from how much data is on hand — the same
// discipline lib/business's deriveOverallHealth() applies: how complete
// a profile is and how ready the business actually is are different
// questions.
export function deriveDecisionReadiness(): DecisionReadiness {
  return {
    investment: unassessed(),
    funding: unassessed(),
    expansion: unassessed(),
    operational: unassessed(),
    technology: unassessed(),
  };
}
