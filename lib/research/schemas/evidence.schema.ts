import { z } from "zod";
import { SourceSchema } from "@/lib/research/schemas/source.schema";

// The contract every future AI-generated claim must be backed by: what
// was claimed, what evidence supports it, how confident we are, and
// exactly where it came from — traceable back to a real Source, not just
// a URL string, so the full provenance chain (provider → source →
// evidence) is always inspectable.
export const EvidenceSchema = z.object({
  id: z.string(),
  claim: z.string(),
  evidence: z.string(),
  confidence: z.number().min(0).max(100),
  source: SourceSchema,
  url: z.string().url(),
  retrievedAt: z.string(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
