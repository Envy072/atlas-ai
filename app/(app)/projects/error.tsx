"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import ErrorState from "@/components/shared/ErrorState";

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

// Segment-level error boundary for /projects and /projects/[id]
// (MILESTONE_29_DESIGN.md Deliverable 9). This segment isn't wrapped by
// AppShell (app/dashboard/layout.tsx's own comment: /projects
// intentionally isn't wrapped yet — see DASHBOARD.md), so this renders
// as a bare page, matching /projects' own current chrome exactly.
//
// Milestone 121 — reports the same error to Sentry (DSN-optional/
// no-op without one configured) alongside the existing console.error.
//
// Milestone 123 — also reports the same error as a product event
// (UNEXPECTED_CLIENT_ERROR), mirroring app/error.tsx's own identical
// reasoning.
export default function ProjectsError({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
    trackEvent(ANALYTICS_EVENTS.UNEXPECTED_CLIENT_ERROR);
  }, [error]);

  return (
    <ErrorState
      onRetry={unstable_retry}
      title="Something went wrong loading your projects"
      description="An unexpected error occurred. Try again, or come back in a moment."
    />
  );
}
