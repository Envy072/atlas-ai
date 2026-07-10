import type { ResearchProvider } from "@/lib/research/types/provider";
import { buildNotImplementedResult } from "@/lib/research/providers/notImplementedResult";

// Architecture only — no real Reddit API call yet.
export const redditProvider: ResearchProvider = {
  id: "reddit",
  name: "Reddit",
  sourceType: "social",
  async search(query) {
    const startedAt = Date.now();
    return buildNotImplementedResult("reddit", query, startedAt);
  },
};
