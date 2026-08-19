import { z } from "zod";
// Milestone 127 — imported from its specific schema file, not
// lib/pipeline's full public barrel, for the same reason
// session.schema.ts's own sibling imports now are (see that file's own
// comment): this schema is reachable from a Client Component
// (hooks/useAnalysisSession.ts), and the full barrel now also re-exports
// pipelineEngine.ts, which needs the Node-only node:async_hooks.
import { StageNameSchema } from "@/lib/pipeline/schemas/enums";
import { TimelineEntryKindSchema } from "@/lib/analysis-session/schemas/enums";

// One curated, human-readable moment in a session's Timeline (Section
// 6). `stage` reuses lib/pipeline's own StageNameSchema — never
// redefined. `label` is always fixed, templated copy (see
// timeline/buildTimeline.ts) — never generated text.
export const TimelineEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  stage: StageNameSchema.optional(),
  kind: TimelineEntryKindSchema,
  label: z.string(),
});

export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
