import type { Dependency } from "@/lib/business/schemas/execution.schema";
import { DependencySchema } from "@/lib/business/schemas/execution.schema";
import type { Severity } from "@/lib/market";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildDependencyInput {
  name: string;
  description?: string;
  criticality?: Severity;
}

// The one place a Dependency gets constructed — construction only, for a
// future caller with real, evidenced input.
export function buildDependency(input: BuildDependencyInput): Dependency {
  return parseOrThrow(
    DependencySchema,
    {
      name: input.name,
      description: input.description,
      criticality: input.criticality,
    },
    "Failed to build a schema-valid Dependency."
  );
}
