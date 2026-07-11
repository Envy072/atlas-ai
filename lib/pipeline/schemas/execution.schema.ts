import { z } from "zod";
import { PipelineStateSchema } from "@/lib/pipeline/schemas/enums";
import { PipelineContextSchema } from "@/lib/pipeline/schemas/context.schema";
import { StageRecordSchema } from "@/lib/pipeline/schemas/stage.schema";
import { ProgressSnapshotSchema } from "@/lib/pipeline/schemas/progress.schema";

export const StartPipelineInputSchema = z.object({
  startupIdea: z.string().min(1),
});

export type StartPipelineInput = z.infer<typeof StartPipelineInputSchema>;

// The one persisted record this whole platform exists to drive — a
// single checkpoint is the FULL current state, never a diff (Section
// 10), so resuming never needs to replay history. `context` holds every
// stage's own output (Section 21); `stageHistory` holds every attempt
// ever made (Section 8's retry counts are derived from it, never tracked
// as separate counters); `progress` and `errorSummary` are both derived
// facts recomputed at each transition, not independently-maintained
// state that could drift from `stageHistory`.
export const PipelineExecutionSchema = z.object({
  id: z.string(),
  startupIdea: z.string().min(1),
  state: PipelineStateSchema,
  currentStageIndex: z.number().int().min(0).max(6),
  context: PipelineContextSchema,
  stageHistory: z.array(StageRecordSchema),
  progress: ProgressSnapshotSchema,
  errorSummary: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PipelineExecution = z.infer<typeof PipelineExecutionSchema>;
