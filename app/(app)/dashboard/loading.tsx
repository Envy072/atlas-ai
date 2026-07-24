import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Shown automatically by Next.js while app/dashboard/page.tsx's
// listProjects()/getUserTier()/countProjectsThisMonth() calls are in
// flight. Mirrors Dashboard Home's actual shape (welcome banner,
// account summary, 4 stat cards, 2 panels) rather than a single
// generic spinner, per DESIGN_SYSTEM.md's Loading States guidance —
// updated for the account summary card Milestone 45 added.
export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-40 rounded-3xl md:h-32" />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <Skeleton className="mt-6 h-4 w-24" />
            <Skeleton className="mt-2 h-9 w-16" />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <div className="border-b border-border p-5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-4 w-48" />
            </div>

            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-4 p-5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
