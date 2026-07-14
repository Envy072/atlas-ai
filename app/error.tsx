"use client";

import { useEffect } from "react";
import ErrorState from "@/components/shared/ErrorState";

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

// Root-level error boundary (MILESTONE_29_DESIGN.md Deliverable 9) —
// catches an unhandled error anywhere not covered by a more specific
// boundary (app/dashboard/error.tsx, app/projects/error.tsx). Uses
// unstable_retry() rather than the older reset() prop, per this app's
// own Next.js version (16.2.10)'s error.js docs: "In most cases, you
// should use unstable_retry() instead" — re-fetches and re-renders the
// failed segment instead of just clearing local error state.
export default function RootError({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState onRetry={unstable_retry} />;
}
