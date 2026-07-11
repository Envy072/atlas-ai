import type { Regulation } from "@/lib/market/schemas/regulation.schema";
import { RegulationSchema } from "@/lib/market/schemas/regulation.schema";
import type { Severity } from "@/lib/market/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildRegulationInput {
  name: string;
  jurisdiction?: string;
  description?: string;
  severity?: Severity;
}

// The one place a Regulation gets constructed — construction only, no
// automatic regulation-detection pipeline exists yet.
export function buildRegulation(input: BuildRegulationInput): Regulation {
  return parseOrThrow(
    RegulationSchema,
    {
      name: input.name,
      jurisdiction: input.jurisdiction,
      description: input.description,
      severity: input.severity,
    },
    "Failed to build a schema-valid Regulation."
  );
}
