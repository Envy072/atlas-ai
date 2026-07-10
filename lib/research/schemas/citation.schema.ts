import { z } from "zod";

// How a specific generated claim (e.g. a future pipeline stage's output)
// references the Evidence that backs it. Distinct from Evidence itself:
// Evidence is the raw gathered fact; a Citation is a pointer from
// generated content back to one or more Evidence entries, so a UI can
// render "3 sources" next to a claim without duplicating the evidence
// text inline.
export const CitationSchema = z.object({
  id: z.string(),
  claim: z.string(),
  evidenceIds: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(100),
});

export type Citation = z.infer<typeof CitationSchema>;
