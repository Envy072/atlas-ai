import { z } from "zod";

// One customer segment within a market. `estimatedSizeUsd` is optional for
// the same "never fabricate" reason as MarketSizeEstimate — a segment
// discovered from qualitative research (pain points, description) may have
// no reliable size figure yet.
export const CustomerSegmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  estimatedSizeUsd: z.number().nonnegative().optional(),
  painPoints: z.array(z.string()),
});

export type CustomerSegment = z.infer<typeof CustomerSegmentSchema>;
