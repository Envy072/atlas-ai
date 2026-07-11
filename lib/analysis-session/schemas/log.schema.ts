import { z } from "zod";
import { StageNameSchema } from "@/lib/pipeline";
import { LogLevelSchema } from "@/lib/analysis-session/schemas/enums";

// One verbose Log line (Section 9) — the counterpart to TimelineEntry
// that shows every attempt, not just the curated start/complete pair per
// stage. `stage` reuses lib/pipeline's own StageNameSchema — never
// redefined.
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: LogLevelSchema,
  message: z.string(),
  stage: StageNameSchema.optional(),
  attempt: z.number().int().positive().optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;
