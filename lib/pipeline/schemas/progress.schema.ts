import { z } from "zod";

// Real, computed progress (Section 7) — never a fabricated number.
// `estimatedRemainingMs` is absent (not 0) whenever there's no completed
// stage yet to average a duration from, the same "absent, never a
// fabricated placeholder" discipline every Phase 1 platform's own
// honest-estimate schemas (MarketSizeEstimate, FinancialEstimate,
// DecisionConfidence) already established.
export const ProgressSnapshotSchema = z.object({
  completedStages: z.number().int().min(0).max(6),
  percent: z.number().min(0).max(100),
  estimatedRemainingMs: z.number().nonnegative().optional(),
});

export type ProgressSnapshot = z.infer<typeof ProgressSnapshotSchema>;
