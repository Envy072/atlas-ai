import { z } from "zod";
import { StageNameSchema } from "@/lib/pipeline";
import { TimelineEntryKindSchema } from "@/lib/analysis-session/schemas/enums";

// One curated, human-readable moment in a session's Timeline (Section
// 6). `stage` reuses lib/pipeline's own StageNameSchema (imported from
// its public barrel) — never redefined. `label` is always fixed,
// templated copy (see timeline/buildTimeline.ts) — never generated text.
export const TimelineEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  stage: StageNameSchema.optional(),
  kind: TimelineEntryKindSchema,
  label: z.string(),
});

export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
