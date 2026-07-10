import { z } from "zod";
import { runChatCompletion } from "@/lib/services/openai";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildExecutionRoadmapPrompt } from "@/lib/analysis/prompts/executionRoadmap.prompt";

export interface ExecutionRoadmapInput {
  idea: string;
  solution: string;
  business_model: string;
  risks: string[];
  opportunities: string[];
}

const ExecutionRoadmapOutputSchema = z.object({
  next_steps: z.array(z.string()),
});

export type ExecutionRoadmapOutput = z.infer<typeof ExecutionRoadmapOutputSchema>;

// Stage 9 — the recommended execution roadmap.
export async function analyze(input: ExecutionRoadmapInput): Promise<ExecutionRoadmapOutput> {
  const prompt = buildExecutionRoadmapPrompt(input);
  const raw = await runChatCompletion({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return parseOrThrow(
    ExecutionRoadmapOutputSchema,
    raw,
    "Execution Roadmap stage returned an unexpected response shape."
  );
}
