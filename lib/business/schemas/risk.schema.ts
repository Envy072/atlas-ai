import { z } from "zod";
import { SeveritySchema } from "@/lib/market";

// One identified operational risk — `severity` reuses lib/market's own
// Severity schema (imported from "@/lib/market", its public barrel)
// rather than redefining the same low/medium/high enum a fourth time
// across this codebase's knowledge platforms.
export const OperationalRiskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  severity: SeveritySchema.optional(),
});

export type OperationalRisk = z.infer<typeof OperationalRiskSchema>;
