"use client";

import { formatRelativeTime } from "@/lib/format";

interface RelativeTimeProps {
  isoDate: string;
  className?: string;
}

// Milestone 111 — the server and the client's first hydration render can
// legitimately disagree on which second/minute/hour bucket
// formatRelativeTime() falls into, since it reads Date.now() internally
// and the two renders happen at two different real moments (page render
// vs. hydration, often seconds apart). suppressHydrationWarning is
// React's own sanctioned escape hatch for exactly this "expected to
// differ slightly, and that's fine" case (react.dev's own
// hydration-mismatch guidance uses a timestamp as its example) — not a
// workaround for an actual bug. Every relative-time render that's part of
// a Client Component's SSR'd output goes through this one component
// rather than calling formatRelativeTime() directly, so the guard lives
// in exactly one place instead of being duplicated per call site.
export default function RelativeTime({ isoDate, className }: RelativeTimeProps) {
  return (
    <span className={className} suppressHydrationWarning>
      {formatRelativeTime(isoDate)}
    </span>
  );
}
