import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";

interface ErrorStateProps {
  onRetry: () => void;
  title?: string;
  description?: string;
}

// The shared "something broke" fallback for every route-level error.tsx
// boundary (MILESTONE_29_DESIGN.md Deliverable 9) — the same card
// rendered identically by app/error.tsx, app/dashboard/error.tsx, and
// app/projects/error.tsx is exactly the "three repetitions" trigger
// CLAUDE.md's Component Rules name for promoting a shared primitive,
// not a premature abstraction for a pattern that might not repeat.
// Composes EmptyState (already this app's standard "nothing here"
// visual language) rather than inventing a second one.
export default function ErrorState({
  onRetry,
  title = "Something went wrong",
  description = "An unexpected error occurred. Try again, or come back in a moment.",
}: ErrorStateProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md items-center p-8">
      <Card className="w-full">
        <EmptyState
          icon={AlertTriangle}
          title={title}
          description={description}
          action={<Button onClick={onRetry}>Try again</Button>}
        />
      </Card>
    </div>
  );
}
