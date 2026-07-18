import Link from "next/link";
import { Check, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { getCurrentUser } from "@/lib/services/auth";
import { getUserTier } from "@/lib/services/stripe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { H2, H3, Display, Body, Small, Caption } from "@/components/ui/typography";

interface PricingTier {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
}

// Free and Founder only — the real, current tiers (ATLAS_AI_V2_STRATEGY.md
// Section 17). The "Builder" tier is deliberately not listed: its content
// (the v3 Execution layer) doesn't exist yet (MILESTONE_43_DESIGN.md
// Outside Scope). Founder's price is £29/month — the real Stripe
// Product's own price (MILESTONE_44_DESIGN.md correction; the $29 figure
// this page originally showed was settled from Milestone 43's open
// $29-39 range before the real Stripe Product existed, in the wrong
// currency).
const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "£0",
    cadence: "forever",
    description: "Try Atlas AI on a real idea before committing to anything.",
    features: ["1-2 analyses per month", "Executive Summary only", "History kept for 30 days"],
  },
  {
    name: "Founder",
    price: "£29",
    cadence: "/month",
    description: "For founders who want the full picture, and want it to stick around.",
    features: [
      "Unlimited analyses",
      "The full artifact suite — Executive Summary, Investment Memo, Due Diligence Report",
      "Permanent history — nothing expires",
      "Re-validation nudges when an analysis goes stale",
    ],
  },
];

// Reads a public env var so the real Stripe Payment Link (created
// directly in the Stripe Dashboard, not by this app's own code) can be
// dropped in without a code change. As of Milestone 44, this is real
// and configured.
const FOUNDER_PAYMENT_LINK_URL = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL;

// Appends Stripe Checkout's own client_reference_id parameter — how
// this codebase correlates a completed payment back to a real Atlas AI
// account in the webhook handler (MILESTONE_44_DESIGN.md Webhook
// Design, "the correlation problem"). Stripe Payment Links honor this
// query parameter and carry it through to the resulting Checkout
// Session unmodified.
function buildFounderCheckoutUrl(paymentLinkUrl: string, userId: string): string {
  const url = new URL(paymentLinkUrl);
  url.searchParams.set("client_reference_id", userId);
  return url.toString();
}

export default async function PricingPage() {
  const user = await getCurrentUser();
  // Only ever "founder" for a real, active subscription (getUserTier()
  // itself already collapses "no row"/canceled/past_due to "free") — a
  // signed-out visitor is never checked at all, avoiding a pointless
  // query for someone with no account to have a tier on. Named
  // `userTier`, not `tier` — the tier CARD being rendered below (a
  // PricingTier object) already owns that name in its own map callback,
  // and shadowing it here would silently compare a whole object to a
  // string.
  const userTier = user ? await getUserTier(user.id) : "free";

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 pt-32 pb-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Pricing</p>
          <Display className="mt-2">Simple, honest pricing.</Display>
          <Body className="mx-auto mt-4 max-w-xl text-gray-600">
            No hidden tiers, no feature sold before it exists. Start free, upgrade when unlimited analyses and a
            permanent record are worth it to you.
          </Body>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {TIERS.map((tier) => (
            <Card key={tier.name} className={tier.name === "Founder" ? "border-blue-600 p-8" : "p-8"}>
              <H3>{tier.name}</H3>
              <div className="mt-4 flex items-baseline gap-1">
                <Display className="text-4xl md:text-4xl">{tier.price}</Display>
                <Small className="text-gray-500">{tier.cadence}</Small>
              </div>
              <Body className="mt-3 text-gray-600">{tier.description}</Body>

              <ul className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <Small className="text-gray-700">{feature}</Small>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {tier.name === "Founder" && userTier === "founder" ? (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      <Small className="text-success">Founder Plan Active</Small>
                    </div>
                    <Caption className="mt-1 text-success/80">Unlimited analyses</Caption>
                  </div>
                ) : tier.name === "Free" ? (
                  <Button className="w-full" variant="secondary" render={<Link href="/signup" />}>
                    Get started free
                  </Button>
                ) : !FOUNDER_PAYMENT_LINK_URL ? (
                  <div className="space-y-2">
                    <Button className="w-full" disabled>
                      Get Founder
                    </Button>
                    <Caption className="text-center">Payment link coming soon.</Caption>
                  </div>
                ) : user ? (
                  <Button className="w-full" render={<Link href={buildFounderCheckoutUrl(FOUNDER_PAYMENT_LINK_URL, user.id)} />}>
                    Get Founder
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    render={<Link href={`/login?redirectTo=${encodeURIComponent("/pricing")}`} />}
                  >
                    Sign in to get Founder
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <H2 className="text-2xl">Questions about which tier fits?</H2>
          <Body className="mt-2 text-gray-600">Every analysis you run today stays real, evidenced, and honest — no tier changes that.</Body>
        </div>
      </div>
    </main>
  );
}
