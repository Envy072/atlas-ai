import { z } from "zod";

// Every provider this engine must be able to support (Milestone 4 goal),
// whether or not a concrete provider module exists for it yet. Adding a
// real GovernmentDatasetProvider later, for example, never requires
// touching this list's *consumers* — only adding the provider file itself
// and registering it in providers/registry.ts.
export const ProviderIdSchema = z.enum([
  "google",
  "tavily",
  "brave",
  "bing",
  "reddit",
  "github",
  "crunchbase",
  "company_website",
  "government_dataset",
  "news",
]);

export type ProviderId = z.infer<typeof ProviderIdSchema>;

// The category a source belongs to, independent of which specific
// provider returned it (e.g. both "google" and "bing" return
// "search_engine" sources).
export const SourceTypeSchema = z.enum([
  "search_engine",
  "social",
  "code_repository",
  "business_database",
  "company_website",
  "government_dataset",
  "news",
]);

export type SourceType = z.infer<typeof SourceTypeSchema>;

// "not_configured" is distinct from "not_implemented": the provider's
// search() is real code (Milestone 5), but no API key/credential is
// present in this environment. Conflating the two would be dishonest —
// one means "this code doesn't exist yet," the other means "this code
// exists and would run if configured."
export const ProviderResultStatusSchema = z.enum([
  "ok",
  "error",
  "timeout",
  "not_implemented",
  "not_configured",
]);

export type ProviderResultStatus = z.infer<typeof ProviderResultStatusSchema>;
