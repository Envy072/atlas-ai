import { z } from "zod";
import { PipelineEventTypeSchema, StageNameSchema } from "@/lib/pipeline/schemas/enums";

// One event in the stream a future UI (or the checkpoint writer itself)
// subscribes to (Section 11). `message` is always a safe, human-readable
// summary — never a raw error object or stack trace (Section 12).
export const PipelineEventSchema = z.object({
  type: PipelineEventTypeSchema,
  executionId: z.string(),
  timestamp: z.string(),
  stage: StageNameSchema.optional(),
  attempt: z.number().int().positive().optional(),
  message: z.string().optional(),
});

export type PipelineEvent = z.infer<typeof PipelineEventSchema>;
