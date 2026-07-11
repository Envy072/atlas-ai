import { z } from "zod";
import { MoatTypeSchema } from "@/lib/business/schemas/enums";

// A startup's economic moat — every field optional, since a freshly
// synthesized BusinessProfile has no real basis to assess any of them yet
// (see moat/economicMoat.ts). `strengthScore` mirrors lib/financial's
// FinancialEstimate honesty discipline: absent rather than fabricated
// until a real assessment methodology exists.
export const EconomicMoatSchema = z.object({
  type: MoatTypeSchema.optional(),
  strengthScore: z.number().min(0).max(100).optional(),
  rationale: z.string().optional(),
});

export type EconomicMoat = z.infer<typeof EconomicMoatSchema>;
