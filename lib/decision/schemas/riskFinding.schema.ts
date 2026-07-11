import { z } from "zod";
import { EvidenceSchema } from "@/lib/research";
import { FindingCategorySchema, RedFlagSeveritySchema } from "@/lib/decision/schemas/enums";

// A red flag — "Evidence-backed only" is enforced structurally, not just
// documented: `evidence` requires at least one real Evidence entry, so a
// RiskFinding can never represent an unsupported claim. This is a
// deliberately stricter contract than FindingSchema's `evidence`, which
// may legitimately be empty.
export const RiskFindingSchema = z.object({
  id: z.string(),
  category: FindingCategorySchema,
  severity: RedFlagSeveritySchema,
  summary: z.string().min(1),
  evidence: z.array(EvidenceSchema).min(1),
  confidence: z.number().min(0).max(100),
});

export type RiskFinding = z.infer<typeof RiskFindingSchema>;
