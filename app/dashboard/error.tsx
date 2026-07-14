"use client";

import { useEffect } from "react";
import ErrorState from "@/components/shared/ErrorState";

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

// Segment-level error boundary for /dashboard and /dashboard/analysis
// (MILESTONE_29_DESIGN.md Deliverable 9) — renders inside AppShell
// (app/dashboard/layout.tsx stays mounted around it), so the sidebar
// and header remain usable even if the dashboard content itself throws.
export default function DashboardError({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      onRetry={unstable_retry}
      title="Something went wrong loading your dashboard"
      description="An unexpected error occurred. Try again, or come back in a moment."
    />
  );
}
