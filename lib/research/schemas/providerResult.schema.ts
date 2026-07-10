import { z } from "zod";
import { ProviderIdSchema, ProviderResultStatusSchema } from "@/lib/research/schemas/enums";
import { SourceSchema } from "@/lib/research/schemas/source.schema";

// What a single provider's search() call returns. `status` is what makes
// "no real requests yet" honest instead of silently empty — a consumer
// can tell "not_implemented" (this milestone) apart from "ok, and it
// genuinely found nothing" or "error" (both future states) instead of
// treating an empty `sources` array as ambiguous.
export const ProviderResultSchema = z.object({
  providerId: ProviderIdSchema,
  query: z.string(),
  status: ProviderResultStatusSchema,
  sources: z.array(SourceSchema),
  fetchedAt: z.string(),
  tookMs: z.number().nonnegative(),
  error: z.string().optional(),
});

export type ProviderResult = z.infer<typeof ProviderResultSchema>;
