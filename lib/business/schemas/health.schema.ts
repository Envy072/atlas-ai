import { z } from "zod";
import { BusinessHealthRatingSchema } from "@/lib/business/schemas/enums";

// The culminating synthesized judgment of a BusinessProfile — `rating` is
// optional because this milestone's synthesis has no honest basis to
// assign one yet (a real rating requires the scoring engine's real
// dimension scores, which are themselves architecture-only placeholders
// today; see profile/businessHealth.ts and scoring/scoringDimensions.ts).
export const BusinessHealthSchema = z.object({
  rating: BusinessHealthRatingSchema.optional(),
  rationale: z.string().optional(),
});

export type BusinessHealth = z.infer<typeof BusinessHealthSchema>;
