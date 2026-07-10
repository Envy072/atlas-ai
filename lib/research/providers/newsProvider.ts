import type { ResearchProvider } from "@/lib/research/types/provider";
import { buildNotImplementedResult } from "@/lib/research/providers/notImplementedResult";

// Architecture only — no real news API call yet.
export const newsProvider: ResearchProvider = {
  id: "news",
  name: "News",
  sourceType: "news",
  async search(query) {
    const startedAt = Date.now();
    return buildNotImplementedResult("news", query, startedAt);
  },
};
