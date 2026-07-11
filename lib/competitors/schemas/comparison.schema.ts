import { z } from "zod";
import { ComparisonDimensionSchema } from "@/lib/competitors/schemas/enums";

// One company's rendering for one comparison dimension. `values` is always
// a string list — even a dimension that's conceptually a single value
// (business model) is a one-element array — so a future UI renders every
// dimension the same way instead of special-casing shapes per dimension.
export const ComparisonCellSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  values: z.array(z.string()),
});

export type ComparisonCell = z.infer<typeof ComparisonCellSchema>;

export const ComparisonTableSchema = z.object({
  dimension: ComparisonDimensionSchema,
  cells: z.array(ComparisonCellSchema),
});

export type ComparisonTable = z.infer<typeof ComparisonTableSchema>;

// The full reusable comparison object (comparison/comparisonEngine.ts) —
// one table per dimension, across the same fixed set of companies, so a
// future UI can render it as a grid without reshaping the data itself.
export const ComparisonMatrixSchema = z.object({
  companyIds: z.array(z.string()),
  tables: z.array(ComparisonTableSchema),
  generatedAt: z.string(),
});

export type ComparisonMatrix = z.infer<typeof ComparisonMatrixSchema>;
