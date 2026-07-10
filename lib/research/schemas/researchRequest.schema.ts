import { z } from "zod";
import { ProviderIdSchema } from "@/lib/research/schemas/enums";

// A request to research a topic (a startup idea, a competitor name, a
// market). `providers` lets a caller restrict which providers run;
// omitted means "every registered provider." Neither field is enforced
// yet by real provider behavior, but the shape is what the orchestrator
// and every provider already agree on.
export const ResearchRequestSchema = z.object({
  topic: z.string().min(1),
  providers: z.array(ProviderIdSchema).optional(),
  maxResultsPerProvider: z.number().int().positive().optional(),
  freshnessWindowDays: z.number().int().positive().optional(),
});

export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
