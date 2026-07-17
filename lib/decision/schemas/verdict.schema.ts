import { z } from "zod";
import { EvidenceSchema } from "@/lib/research";
import { VerdictCategorySchema } from "@/lib/decision/schemas/enums";

// The Final Verdict (MILESTONE_38_DESIGN.md Section 5) — a single,
// evidence-traceable conclusion assembled from Decision Intelligence's
// own already-real findings/critical risks/investment thesis/
// recommendations. `confidence` is mechanically computed (see
// verdict/decisionVerdict.ts's computeVerdictConfidence()), never
// model-generated — unlike every other real-generation facet's own
// confidence field. Deliberately has no `id` field: exactly one
// DecisionVerdict exists per computation, consumed immediately by its
// caller, never a member of a collection anything dedupes or looks up
// by id.
export const DecisionVerdictSchema = z.object({
  category: VerdictCategorySchema,
  summary: z.string().min(1),
  confidence: z.number().min(0).max(100),
  supportingEvidence: z.array(EvidenceSchema),
});

export type DecisionVerdict = z.infer<typeof DecisionVerdictSchema>;
