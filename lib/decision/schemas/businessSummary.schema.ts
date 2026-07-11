import { z } from "zod";
import { CompetitivePositionSchema, BusinessHealthSchema } from "@/lib/business";

// A real, honest SELECTION of BusinessProfile's own fields — never a
// re-derivation. `competitivePosition` and `overallHealth` are reused
// directly from lib/business's own schemas (imported from its public
// barrel), not redefined, per this milestone's "never duplicate lower-
// layer logic" rule.
export const BusinessSummarySchema = z.object({
  businessModel: z.string().optional(),
  valueProposition: z.string().optional(),
  customerProblem: z.string().optional(),
  competitivePosition: CompetitivePositionSchema.optional(),
  overallHealth: BusinessHealthSchema,
});

export type BusinessSummary = z.infer<typeof BusinessSummarySchema>;
