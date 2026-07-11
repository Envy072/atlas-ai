import { z } from "zod";
import { BillingPeriodSchema } from "@/lib/competitors/schemas/enums";

// One published pricing tier — "Starter", "Pro", "Enterprise" — not every
// field is knowable for every company (enterprise tiers are frequently
// "contact sales"), hence the optional price.
export const PricingTierSchema = z.object({
  name: z.string(),
  priceUsd: z.number().nonnegative().optional(),
  billingPeriod: BillingPeriodSchema.optional(),
  notes: z.string().optional(),
});

export type PricingTier = z.infer<typeof PricingTierSchema>;

// A company's pricing as a whole. `model` is a short free-text label
// ("freemium", "per-seat subscription") rather than a fixed enum — unlike
// billing period, the space of real-world pricing models is too varied to
// enumerate honestly without inventing categories nobody asked for.
export const PricingSchema = z.object({
  model: z.string().optional(),
  startingPriceUsd: z.number().nonnegative().optional(),
  tiers: z.array(PricingTierSchema),
});

export type Pricing = z.infer<typeof PricingSchema>;
