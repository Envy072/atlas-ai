import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { H1 } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";

// An honest stub (MILESTONE_29_DESIGN.md Deliverable 8) — not a built
// feature. A standalone research workspace is a future milestone;
// market intelligence already appears inside each project's Decision
// Report today.
export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <H1 className="mb-8">Market Research</H1>
      <Card>
        <EmptyState
          icon={Search}
          title="A dedicated research workspace is coming soon"
          description="Market intelligence already appears inside each project's Decision Report — a standalone research view is planned for a future milestone."
        />
      </Card>
    </div>
  );
}
