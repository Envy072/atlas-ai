import { z } from "zod";
import { RecommendationCategorySchema, RecommendationPrioritySchema } from "@/lib/business/schemas/enums";

// The reusable recommendation object this milestone specifies — every
// field the spec requires (category, priority, reason, requiredEvidence,
// confidence). Architecture only within this platform's own code: this
// schema and its one constructor (recommendations/recommendationBuilder.ts)
// exist so a caller can start generating real recommendations against
// an already-agreed shape; nothing in this file generates one itself.
//
// `requiredEvidence`'s convention, defined at Milestone 37 (Decision
// Intelligence's own lib/decision/recommendations/recommendationGenerator.ts
// — the first real caller to populate this field with anything):
// real, traceability-verified `Evidence.id` strings the recommendation's
// own citations resolved to — not free-text descriptions of evidence
// that would still need to be gathered. Any future caller of
// `buildRecommendation()` (including a Business-Platform-side one
// reading a `BusinessProfile`/`BusinessScore`) should populate this
// field the same way, so its meaning stays consistent regardless of
// which platform constructs a given `Recommendation`.
export const RecommendationSchema = z.object({
  id: z.string(),
  category: RecommendationCategorySchema,
  priority: RecommendationPrioritySchema,
  reason: z.string().min(1),
  requiredEvidence: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
