"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics/events";

interface AnalyticsLinkProps
  extends LinkProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> {
  event: AnalyticsEvent;
  eventProperties?: AnalyticsProperties;
}

// Milestone 123 — a next/link Link that fires one product event on
// click, before navigating away. For an outbound link (e.g. Stripe's
// own hosted checkout page) there's no page of this app's own left to
// observe the interaction server-side afterward, unlike an in-app link
// — those are instead tracked server-side, on the destination page
// itself (see app/projects/[id]/page.tsx's own PROJECT_OPENED). A
// small, reusable wrapper rather than a one-off inline handler, so any
// future "track this outbound click" need reuses it instead of a
// separately-invented pattern each time — this codebase's own
// "prefer reusable helper functions" standard (CLAUDE.md Section 11),
// applied to a behavioral wrapper rather than a visual one.
//
// Forwards every prop via `{...props}` so this composes correctly with
// components/ui/button.tsx's own `render` prop (Base UI clones the
// given element and merges its own className/children onto it) exactly
// the way a bare `<Link>` already does at every other call site in this
// codebase.
export default function AnalyticsLink({ event, eventProperties, onClick, ...props }: AnalyticsLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    trackEvent(event, eventProperties);
    onClick?.(e);
  }

  return <Link {...props} onClick={handleClick} />;
}
