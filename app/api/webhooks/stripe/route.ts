import {
  constructWebhookEvent,
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from "@/lib/services/stripe";
import { jsonSuccess, jsonError } from "@/lib/api/response";

// The one route in this codebase authenticated by a cryptographic
// signature rather than a user session (MILESTONE_44_DESIGN.md API
// Impact) — Stripe calls this from the internet with no cookies, no
// JWT. request.text() is used deliberately instead of request.json():
// signature verification needs the exact original request bytes, and
// re-serializing a parsed JSON object can produce a byte-different
// string that silently fails verification.
//
// Only three event types are handled; every other type Stripe sends is
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
      default:
        break;
    }

    return jsonSuccess({ received: true });
  } catch (error) {
    return jsonError(error);
  }
}
