import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { WebhookVerificationError, ExternalServiceError } from "@/lib/errors";
import type { SubscriptionTier, SubscriptionStatus } from "@/lib/schemas/subscription";

// The upper bound of the pricing page's own "1-2 analyses per month"
// Free tier copy (app/pricing/page.tsx) — a real, adjustable policy
// value, not a placeholder, exactly like lib/competitors/refresh's own
// REFRESH_INTERVAL_DAYS. One named constant, imported wherever
// enforcement needs it, rather than a magic number repeated at each
// call site.
export const FREE_TIER_MONTHLY_ANALYSIS_LIMIT = 2;

// Milestone 44's one new service, shaped like every other file in this
// directory (plain async functions, typed AppError throws, no
// framework imports) — with one deliberate, named exception:
// lib/supabase/admin.ts's service-role client, used here and nowhere
// else (MILESTONE_44_DESIGN.md Self-Review).
//
// No custom Checkout Session creation exists in this file, deliberately
// (MILESTONE_44_DESIGN.md Architecture): the real checkout mechanism is
// still Milestone 43's static Stripe Payment Link. Everything below is
// either verifying/reacting to a webhook Stripe sends once that Payment
// Link's checkout completes, or reading back the tier that resulted.
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ExternalServiceError("Stripe", "STRIPE_SECRET_KEY is not set in this environment.");
  }
  return new Stripe(secretKey);
}

// The entire security model for app/api/webhooks/stripe/route.ts
// (MILESTONE_44_DESIGN.md Security Considerations) — the route passes
// this the RAW request body text (never a parsed/re-serialized JSON
// object; signature verification needs the exact original bytes) and
// the `Stripe-Signature` header verbatim.
export async function constructWebhookEvent(rawBody: string, signature: string): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new ExternalServiceError("Stripe", "STRIPE_WEBHOOK_SECRET is not set in this environment.");
  }

  try {
    return getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new WebhookVerificationError();
  }
}

interface SubscriptionRow {
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_customer_id: string;
  stripe_subscription_id: string;
}

// Stripe's own subscription.status has more values (trialing,
// incomplete, incomplete_expired, unpaid, paused, ...) than this app's
// deliberately narrow three-value model needs
// (MILESTONE_44_DESIGN.md Billing/Subscription Architecture) — every
// value maps onto whichever of the three actually changes what a user
// can do. trialing behaves like active (unlocked); incomplete/unpaid
// behave like past_due (payment trouble, not yet resolved);
// incomplete_expired/paused behave like canceled (not unlocked).
function toSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    default:
      return "canceled";
  }
}

// Fires once, when a real customer completes checkout through
// Milestone 43's static Payment Link. client_reference_id is how this
// codebase correlates that payment back to a real Atlas AI account —
// populated by /pricing's Founder CTA appending
// ?client_reference_id={user.id} to the Payment Link URL, which is why
// that CTA requires sign-in first (MILESTONE_44_DESIGN.md Webhook
// Design, "the correlation problem"). A session missing it can't be
// acted on at all — logged for manual follow-up, not thrown: retrying
// this exact event again would never produce a client_reference_id it
// doesn't have, so treating it as a retryable failure would only cause
// Stripe to retry forever for no benefit.
export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.client_reference_id;

  if (!userId) {
    console.error("Stripe webhook: checkout.session.completed with no client_reference_id", session.id);
    return;
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.error("Stripe webhook: checkout.session.completed missing customer/subscription id", session.id);
    return;
  }

  const row: SubscriptionRow = {
    user_id: userId,
    tier: "founder",
    status: "active",
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  };

  const supabase = createAdminClient();
  // Redelivery-safe (Stripe's own at-least-once delivery guarantee,
  // MILESTONE_44_DESIGN.md Webhook Design): upserts on user_id's unique
  // constraint rather than a blind insert, so a duplicate delivery of
  // the same event updates the same row instead of creating a second one.
  const { error } = await supabase.from("subscriptions").upsert(row, { onConflict: "user_id" });

  if (error) {
    throw new ExternalServiceError("Supabase", "Could not activate the Founder subscription.");
  }
}

// Fires on renewal, plan changes, or a status change (e.g. a failed
// payment moving a subscription into past_due) — updates the existing
// row this subscription id already has. If no row exists yet (this
// event arriving before checkout.session.completed's own row-creating
// upsert, a real but rare ordering case), there's nothing to update and
// nothing this handler can safely create instead, since it has no
// client_reference_id/user_id of its own — logged, not thrown, for the
// same "retrying wouldn't help" reason as the missing-reference case
// above.
export async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const supabase = createAdminClient();

  const { data, error: selectError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (selectError) {
    throw new ExternalServiceError("Supabase", "Could not look up the subscription to update.");
  }

  if (!data) {
    console.error("Stripe webhook: customer.subscription.updated for an unknown subscription", subscription.id);
    return;
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: toSubscriptionStatus(subscription.status), updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw new ExternalServiceError("Supabase", "Could not update the subscription status.");
  }
}

// Fires when a subscription is fully canceled/ended — mirrors
// handleSubscriptionUpdated's own "no matching row, nothing to do"
// handling exactly.
export async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw new ExternalServiceError("Supabase", "Could not cancel the subscription.");
  }
}

// The one read path every enforcement point calls
// (MILESTONE_44_DESIGN.md Scope) — "no row" and "row with status !=
// 'active'" both resolve to "free", uniformly, matching this table's
// own "no row = free tier" design (see the migration's own comment).
//
// Deliberately uses the cookie-aware client (lib/supabase/server.ts),
// not the admin client — every real caller already has the requesting
// user's own session in scope, and subscriptions_select_own's RLS
// policy already allows a user to read their own row, so there's no
// reason to reach for RLS-bypassing access here. createAdminClient()
// stays confined to the three webhook handlers above, which have no
// session to read through at all.
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase Error:", error);
    return "free";
  }

  if (!data || data.status !== "active") {
    return "free";
  }

  return data.tier;
}
