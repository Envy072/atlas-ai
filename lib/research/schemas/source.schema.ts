import { z } from "zod";
import { ProviderIdSchema, SourceTypeSchema } from "@/lib/research/schemas/enums";

// A single piece of raw evidence a provider found — a search hit, a
// GitHub repo, a news article, etc. This is the one shape every provider
// must normalize its results into, regardless of how different their
// underlying APIs look.
//
// `confidence` (Milestone 5, additive) is how confident this engine is in
// the source itself — e.g. Tavily's own per-result relevance score, or a
// position-based heuristic for providers (like Brave) that don't return
// one. It's distinct from Evidence.confidence, which is about a specific
// *claim* built from this source, not the source itself. Required, not
// optional: every source-producing provider must supply a real value
// (even a documented heuristic), never a silently-defaulted one.
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
  confidence: z.number().min(0).max(100),
});

export type Source = z.infer<typeof SourceSchema>;
