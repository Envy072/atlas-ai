import { z } from "zod";

// What the entity matcher (matcher/entityMatcher.ts) returns when asked
// "does this candidate name already exist in the knowledge base?". A
// crossing-a-boundary shape (returned by a public function, consumed by
// discovery when deciding whether to create a new CompanyProfile or merge
// into an existing one), so it's schema-validated like everything else
// that leaves its owning module.
export const CompanyMatchResultSchema = z.object({
  matched: z.boolean(),
  confidence: z.number().min(0).max(100),
  matchedCompanyId: z.string().optional(),
  reason: z.string(),
});

export type CompanyMatchResult = z.infer<typeof CompanyMatchResultSchema>;
