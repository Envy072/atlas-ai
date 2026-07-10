import type { ResearchProvider } from "@/lib/research/types/provider";
import { buildNotImplementedResult } from "@/lib/research/providers/notImplementedResult";

// Architecture only — no real GitHub API call yet.
export const githubProvider: ResearchProvider = {
  id: "github",
  name: "GitHub",
  sourceType: "code_repository",
  async search(query) {
    const startedAt = Date.now();
    return buildNotImplementedResult("github", query, startedAt);
  },
};
