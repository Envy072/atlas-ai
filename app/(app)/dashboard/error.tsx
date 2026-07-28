"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import ErrorState from "@/components/shared/ErrorState";

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

// Segment-level error boundary for /dashboard and /dashboard/analysis
// (MILESTONE_29_DESIGN.md Deliverable 9) — renders inside AppShell
// (app/dashboard/layout.tsx stays mounted around it), so the sidebar
// and header remain usable even if the dashboard content itself throws.
//
// Milestone 121 — reports the same error to Sentry (DSN-optional/
// no-op without one configured) alongside the existing console.error.
export default function DashboardError({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorState
      onRetry={unstable_retry}
      title="Something went wrong loading your dashboard"
      description="An unexpected error occurred. Try again, or come back in a moment."
    />
  );
}
