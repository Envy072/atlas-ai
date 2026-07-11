import { z } from "zod";
import { SeveritySchema } from "@/lib/market";

// One key dependency the business relies on (a supplier, a platform API,
// a key hire, a regulatory approval). `criticality` reuses lib/market's
// Severity schema for the same reason OperationalRiskSchema does.
export const DependencySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criticality: SeveritySchema.optional(),
});

export type Dependency = z.infer<typeof DependencySchema>;
