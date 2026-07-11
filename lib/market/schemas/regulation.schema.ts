import { z } from "zod";
import { SeveritySchema } from "@/lib/market/schemas/enums";

// One regulatory constraint relevant to this market. `severity` is
// optional — an identified regulation whose compliance burden hasn't been
// assessed yet is still worth recording, rather than withheld until a
// severity judgment exists.
export const RegulationSchema = z.object({
  name: z.string().min(1),
  jurisdiction: z.string().optional(),
  description: z.string().optional(),
  severity: SeveritySchema.optional(),
});

export type Regulation = z.infer<typeof RegulationSchema>;
