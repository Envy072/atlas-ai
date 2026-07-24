import { LayoutTemplate } from "lucide-react";
import { Card } from "@/components/ui/card";
import { H1 } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";

// An honest stub (MILESTONE_29_DESIGN.md Deliverable 8) — not a built
// feature. A library of reusable idea/analysis templates is planned for
// a future milestone.
export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <H1 className="mb-8">Templates</H1>
      <Card>
        <EmptyState
          icon={LayoutTemplate}
          title="Startup templates are coming soon"
          description="A library of reusable idea and analysis templates is planned for a future milestone."
        />
      </Card>
    </div>
  );
}
