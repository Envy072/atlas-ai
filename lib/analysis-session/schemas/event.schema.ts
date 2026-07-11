import { z } from "zod";
import { SessionEventTypeSchema } from "@/lib/analysis-session/schemas/enums";
import { TimelineEntrySchema } from "@/lib/analysis-session/schemas/timeline.schema";

// One event in the stream a future dashboard subscribes to (Section 8).
// `message` is always a safe, human-readable summary — never a raw
// error object — the same discipline lib/pipeline's own PipelineEvent
// holds itself to.
export const SessionEventSchema = z.object({
  type: SessionEventTypeSchema,
  sessionId: z.string(),
  timestamp: z.string(),
  timelineEntry: TimelineEntrySchema.optional(),
  message: z.string().optional(),
});

export type SessionEvent = z.infer<typeof SessionEventSchema>;
