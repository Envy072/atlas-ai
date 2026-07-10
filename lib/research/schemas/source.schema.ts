import { z } from "zod";
import { ProviderIdSchema, SourceTypeSchema } from "@/lib/research/schemas/enums";

// A single piece of raw evidence a provider found — a search hit, a
// GitHub repo, a news article, etc. This is the one shape every provider
// must normalize its results into, regardless of how different their
// underlying APIs look.
export const SourceSchema = z.object({
  id: z.string(),
  providerId: ProviderIdSchema,
  sourceType: SourceTypeSchema,
  title: z.string(),
  url: z.string().url(),
  domain: z.string(),
  snippet: z.string().optional(),
  publishedAt: z.string().optional(),
  retrievedAt: z.string(),
});

export type Source = z.infer<typeof SourceSchema>;
