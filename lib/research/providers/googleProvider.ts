import type { ResearchProvider } from "@/lib/research/types/provider";
import { buildNotImplementedResult } from "@/lib/research/providers/notImplementedResult";

// Architecture only — no real Google Search API call yet (see
// RESEARCH_ENGINE.md's Future Integration Plan). When one is added, only
// this file's `search` implementation changes; the ResearchProvider
// contract, the orchestrator, and every other provider stay exactly as
// they are.
export const googleProvider: ResearchProvider = {
  id: "google",
  name: "Google Search",
  sourceType: "search_engine",
  async search(query) {
    const startedAt = Date.now();
    return buildNotImplementedResult("google", query, startedAt);
  },
};
