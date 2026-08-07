import * as Sentry from "@sentry/nextjs";
import {
  constructWebhookEvent,
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
} from "@/lib/services/stripe";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { WebhookVerificationError } from "@/lib/errors";

// The one route in this codebase authenticated by a cryptographic
// signature rather than a user session (MILESTONE_44_DESIGN.md API
// Impact) — Stripe calls this from the internet with no cookies, no
// JWT. request.text() is used deliberately instead of request.json():
// signature verification needs the exact original request bytes, and
// re-serializing a parsed JSON object can produce a byte-different
// string that silently fails verification.
//
// Four event types are handled; every other type Stripe sends is
// acknowledged (200) and ignored — this app has no use for the dozens
// of others (MILESTONE_44_DESIGN.md Service-Layer Impact).
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";

    const event = await constructWebhookEvent(rawBody, signature);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      default:
        break;
    }

    return jsonSuccess({ received: true });
  } catch (error) {
    // jsonError() only reports a NON-AppError to Sentry (lib/api/response.ts's
    // own documented convention: every other AppError app-wide is
    // treated as an expected, already-safe failure). That default is
    // right for a bad signature (WebhookVerificationError) — a routine,
    // expected rejection (a stale secret, a scanner probing the
    // endpoint), not a bug — so it's deliberately excluded here too,
    // the same as every other route. But it's wrong for
    // ExternalServiceError specifically: that means Supabase failed to
    // persist a real billing-state change Stripe is telling us about, a
    // genuine operational failure this route's own caller (Stripe) will
    // retry and one that should have Sentry visibility regardless of its
    // AppError status. Reported for every error except a signature
    // rejection, scoped to this one route only — jsonError() itself is
    // untouched, so no other route's Sentry behavior changes.
    console.error("Stripe webhook handler failed:", error);
    if (!(error instanceof WebhookVerificationError)) {
      Sentry.captureException(error);
    }
    return jsonError(error);
  }
}
