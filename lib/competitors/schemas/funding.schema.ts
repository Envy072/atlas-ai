import { z } from "zod";

// A company's funding history as this platform currently knows it — never
// fabricated; every field stays optional/empty until a real source
// (Crunchbase, a press release) actually reports it.
export const FundingSchema = z.object({
  totalRaisedUsd: z.number().nonnegative().optional(),
  lastRoundType: z.string().optional(),
  lastRoundAmountUsd: z.number().nonnegative().optional(),
  lastRoundDate: z.string().optional(),
  investors: z.array(z.string()),
});

export type Funding = z.infer<typeof FundingSchema>;
