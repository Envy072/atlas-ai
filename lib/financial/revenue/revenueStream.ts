import type { RevenueStream } from "@/lib/financial/schemas/revenue.schema";
import { RevenueStreamSchema } from "@/lib/financial/schemas/revenue.schema";
import type { RevenueModel } from "@/lib/financial/schemas/revenue.schema";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildRevenueStreamInput {
  name: string;
  description?: string;
  revenueModel?: RevenueModel;
  estimatedMonthlyUsd?: number;
}

// The one place a RevenueStream gets constructed — construction only, no
// automatic revenue-stream extraction pipeline exists yet.
export function buildRevenueStream(input: BuildRevenueStreamInput): RevenueStream {
  return parseOrThrow(
    RevenueStreamSchema,
    {
      name: input.name,
      description: input.description,
      revenueModel: input.revenueModel,
      estimatedMonthlyUsd: input.estimatedMonthlyUsd,
    },
    "Failed to build a schema-valid RevenueStream."
  );
}
