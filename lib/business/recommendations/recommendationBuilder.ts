import type { Recommendation } from "@/lib/business/schemas/recommendation.schema";
import { RecommendationSchema } from "@/lib/business/schemas/recommendation.schema";
import type { RecommendationCategory, RecommendationPriority } from "@/lib/business/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

let recommendationIdCounter = 0;

function nextRecommendationId(): string {
  recommendationIdCounter += 1;
  return `recommendation_${Date.now()}_${recommendationIdCounter}`;
}

export interface BuildRecommendationInput {
  category: RecommendationCategory;
  priority: RecommendationPriority;
  reason: string;
  requiredEvidence?: string[];
  confidence: number;
}

// ARCHITECTURE ONLY — per this milestone's explicit rule ("Do NOT
// generate recommendations yet"). This is the one place a Recommendation
// gets constructed and validated; it does not decide *what* to
// recommend. A future milestone's generation logic (reading a
// BusinessProfile/BusinessScore and producing real recommendations) calls
// this constructor for each one it produces, exactly like every other
// builder in this codebase's knowledge platforms separates "how a valid
// object is shaped" from "what the real content should be."
export function buildRecommendation(input: BuildRecommendationInput): Recommendation {
  return parseOrThrow(
    RecommendationSchema,
    {
      id: nextRecommendationId(),
      category: input.category,
      priority: input.priority,
      reason: input.reason,
      requiredEvidence: input.requiredEvidence ?? [],
      confidence: input.confidence,
    },
    "Failed to build a schema-valid Recommendation."
  );
}
