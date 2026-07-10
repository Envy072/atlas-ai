import type { ResearchProvider } from "@/lib/research/types/provider";
import { buildNotImplementedResult } from "@/lib/research/providers/notImplementedResult";

// Architecture only — no real Crunchbase API call yet.
export const crunchbaseProvider: ResearchProvider = {
  id: "crunchbase",
  name: "Crunchbase",
  sourceType: "business_database",
  async search(query) {
    const startedAt = Date.now();
    return buildNotImplementedResult("crunchbase", query, startedAt);
  },
};
