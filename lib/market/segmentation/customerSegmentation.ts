import type { CustomerSegment } from "@/lib/market/schemas/segmentation.schema";
import { CustomerSegmentSchema } from "@/lib/market/schemas/segmentation.schema";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildCustomerSegmentInput {
  name: string;
  description?: string;
  estimatedSizeUsd?: number;
  painPoints?: string[];
}

// The one place a CustomerSegment gets constructed, so every caller
// produces the same well-formed, schema-valid shape. Construction only —
// no automatic segment-extraction pipeline exists yet (see
// MARKET_PLATFORM.md's Future Roadmap); a real caller (a future research-
// aware pipeline stage) supplies real, evidenced field values.
export function buildCustomerSegment(input: BuildCustomerSegmentInput): CustomerSegment {
  return parseOrThrow(
    CustomerSegmentSchema,
    {
      name: input.name,
      description: input.description,
      estimatedSizeUsd: input.estimatedSizeUsd,
      painPoints: input.painPoints ?? [],
    },
    "Failed to build a schema-valid CustomerSegment."
  );
}
