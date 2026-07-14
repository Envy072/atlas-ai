import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { H1 } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";

// An honest stub (MILESTONE_29_DESIGN.md Deliverable 8) — not a built
// feature. A dedicated reports view is a future milestone; every
// completed analysis is already saved as a project with its own full
// Decision Report today.
export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <H1 className="mb-8">Reports</H1>
      <Card>
        <EmptyState
          icon={FileText}
          title="Dedicated reports are coming soon"
          description="Every completed analysis is already saved as a project with its own full Decision Report — view it from Projects in the meantime."
        />
      </Card>
    </div>
  );
}
