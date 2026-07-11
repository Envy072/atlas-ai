import { z } from "zod";
import { SeveritySchema } from "@/lib/market";
import { EvidenceSchema } from "@/lib/research";
import { FindingCategorySchema } from "@/lib/decision/schemas/enums";

// A reusable observation — `severity` reuses lib/market's own
// three-level Severity (not redefined), distinct from RiskFindingSchema's
// four-level RedFlagSeverity (see risk.schema.ts) since an ordinary
// finding never needs the "critical" escalation tier a red flag does.
export const FindingSchema = z.object({
  id: z.string(),
  category: FindingCategorySchema,
  severity: SeveritySchema,
  summary: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  confidence: z.number().min(0).max(100),
});

export type Finding = z.infer<typeof FindingSchema>;
