import type { CostStructure } from "@/lib/financial/schemas/costs.schema";
import { CostStructureSchema } from "@/lib/financial/schemas/costs.schema";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildCostStructureInput {
  fixedCostsUsdPerMonth?: number;
  variableCostsUsdPerMonth?: number;
  notes?: string;
}

// The one place a CostStructure gets constructed — construction only.
export function buildCostStructure(input: BuildCostStructureInput): CostStructure {
  return parseOrThrow(
    CostStructureSchema,
    {
      fixedCostsUsdPerMonth: input.fixedCostsUsdPerMonth,
      variableCostsUsdPerMonth: input.variableCostsUsdPerMonth,
      notes: input.notes,
    },
    "Failed to build a schema-valid CostStructure."
  );
}
