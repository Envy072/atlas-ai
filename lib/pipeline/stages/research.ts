import { runResearch } from "@/lib/research";
import type { ResearchResult } from "@/lib/research";
import type { PipelineStageDefinition } from "@/lib/pipeline/types/stage";

// A generic, broad research pass — deliberately not one of the other
// platforms' own specialized query framings (e.g. Market's "market size
// and industry landscape for..."). This stage's purpose is early signal
// and early failure detection before the pipeline commits to the other
// five stages, so a general framing is the honest choice here.
function buildPipelineResearchQuery(startupIdea: string): string {
  return `general research pass for: ${startupIdea}`;
}

// Wraps lib/research's own public runResearch() — never a provider,
// never a deep import. See MILESTONE_11_DESIGN.md Section 5.
export const researchStage: PipelineStageDefinition<ResearchResult> = {
  name: "research",
  async run(startupIdea) {
    return runResearch({ topic: buildPipelineResearchQuery(startupIdea) });
  },
};
