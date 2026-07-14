"use client";

import { useEffect } from "react";
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
export default function ProjectsError({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      onRetry={unstable_retry}
      title="Something went wrong loading your projects"
      description="An unexpected error occurred. Try again, or come back in a moment."
    />
  );
}
