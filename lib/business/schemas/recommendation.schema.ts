import { z } from "zod";
import { RecommendationCategorySchema, RecommendationPrioritySchema } from "@/lib/business/schemas/enums";

// The reusable recommendation object this milestone specifies — every
// field the spec requires (category, priority, reason, requiredEvidence,
// confidence). Architecture only: this schema and its one constructor
// (recommendations/recommendationBuilder.ts) exist so a future milestone
// can start generating real recommendations against an already-agreed
// shape; nothing in this milestone actually generates one from a
// BusinessProfile.
export const RecommendationSchema = z.object({
  id: z.string(),
  category: RecommendationCategorySchema,
  priority: RecommendationPrioritySchema,
  reason: z.string().min(1),
  requiredEvidence: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
