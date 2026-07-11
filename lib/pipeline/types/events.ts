import type { PipelineEvent } from "@/lib/pipeline/schemas/event.schema";

export type PipelineEventListener = (event: PipelineEvent) => void;
