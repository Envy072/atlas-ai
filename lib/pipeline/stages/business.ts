import { discoverBusiness } from "@/lib/business";
import type { BusinessDiscoveryResult } from "@/lib/business";
import type { PipelineStageDefinition } from "@/lib/pipeline/types/stage";

// Wraps lib/business's own public discoverBusiness() — never a
// provider, never a deep import. See MILESTONE_11_DESIGN.md Section 5.
export const businessStage: PipelineStageDefinition<BusinessDiscoveryResult> = {
  name: "business",
  async run(startupIdea) {
    return discoverBusiness({ startupIdea });
  },
};
