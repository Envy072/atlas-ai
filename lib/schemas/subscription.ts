import { z } from "zod";

// The two-tier model (MILESTONE_44_DESIGN.md Billing/Subscription
// Architecture) — no "Builder" tier, deliberately: its content doesn't
// exist yet (Milestone 43/44's shared, explicit outside-scope item).
export const SubscriptionTierSchema = z.enum(["free", "founder"]);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

// Mirrors Stripe's own subscription lifecycle states this app actually
// reacts to. `active` is the only status that unlocks anything —
// `canceled`/`past_due` both resolve to free-tier behavior via
// getUserTier() (lib/services/stripe.ts), with no separate grace-period
// concept (not asked for, would be new complexity).
export const SubscriptionStatusSchema = z.enum(["active", "canceled", "past_due"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

// The full, persisted shape of a public.subscriptions row — one row
// only ever exists for a user who has completed a real Stripe checkout
// (MILESTONE_44_DESIGN.md Database Impact); a user with no row is Free
// by definition, not represented by a row with tier: "free" here.
export const SubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tier: SubscriptionTierSchema,
  status: SubscriptionStatusSchema,
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;
