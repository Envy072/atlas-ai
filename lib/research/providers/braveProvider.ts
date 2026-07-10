import type { ResearchProvider } from "@/lib/research/types/provider";
import { buildNotImplementedResult } from "@/lib/research/providers/notImplementedResult";

// Architecture only — no real Brave Search API call yet.
export const braveProvider: ResearchProvider = {
  id: "brave",
  name: "Brave Search",
  sourceType: "search_engine",
  async search(query) {
    const startedAt = Date.now();
    return buildNotImplementedResult("brave", query, startedAt);
  },
};
