import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth";
import { createBillingPortalUrl } from "@/lib/services/stripe";
import { UnauthorizedError } from "@/lib/errors";
import { jsonError } from "@/lib/api/response";

// GET, not POST — this route's only job is "redirect a signed-in user
// to their real Stripe Customer Portal session," a side-effect-light
// action (it doesn't write anything to our own data) that a plain
// link/button can trigger with no client-side JS at all
// (MILESTONE_45_DESIGN.md Part 4).
//
// next/navigation's redirect() works by throwing a special internal
// signal Next.js catches itself — it must be called outside this
// route's own try/catch, never inside it, or jsonError() would swallow
// that signal and turn a real redirect into a broken JSON response.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(new UnauthorizedError());
  }

  const origin = new URL(req.url).origin;

  let portalUrl: string;
  try {
    portalUrl = await createBillingPortalUrl(user.id, `${origin}/settings/billing`);
  } catch (error) {
    return jsonError(error);
  }

  redirect(portalUrl);
}
