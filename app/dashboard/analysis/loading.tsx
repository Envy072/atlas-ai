import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Shown automatically by Next.js while app/dashboard/analysis/page.tsx's
// listProjects() call is in flight — the same convention
// app/dashboard/loading.tsx already established for Dashboard Home,
// applied to the one route that was missing it (MILESTONE_15_DESIGN.md
// Section 14, "Loading strategy"). Mirrors AIWorkspace's real shape
// (command center card + history panel) rather than a generic spinner.
export default function DashboardAnalysisLoading() {
  return (
    <div className="p-4 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <Card className="p-8">
            <Skeleton className="h-8 w-8 rounded-2xl" />
            <Skeleton className="mt-4 h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
            <Skeleton className="mt-6 h-52 rounded-2xl" />
          </Card>
        </div>

        <Card className="h-fit">
          <div className="border-b border-border p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>

          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 p-5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
