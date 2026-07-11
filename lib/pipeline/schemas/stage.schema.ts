import { z } from "zod";
import { StageNameSchema, StageStatusSchema, StageTriggerSchema } from "@/lib/pipeline/schemas/enums";

// One attempt at one stage — the full, honest history of an execution is
// an ordered array of these, never a single "current status" field that
// would lose what happened on earlier attempts. Retry counts (Section 8)
// are derived from this array (see retry/retryStats.ts) rather than kept
// as separate counters that could drift from what actually happened.
export const StageRecordSchema = z.object({
  stage: StageNameSchema,
  attempt: z.number().int().positive(),
  trigger: StageTriggerSchema,
  status: StageStatusSchema,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  durationMs: z.number().nonnegative().optional(),
  errorMessage: z.string().optional(),
});

export type StageRecord = z.infer<typeof StageRecordSchema>;
