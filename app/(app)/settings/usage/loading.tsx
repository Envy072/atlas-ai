import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors UsagePage's real shape (Milestone 45), matching
// app/dashboard/loading.tsx's own established pattern.
export default function UsageLoading() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <Skeleton className="h-9 w-32" />
      <div className="mt-2 mb-8 flex gap-1 border-b border-border pb-2.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Card className="p-8">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-3 w-64" />
        <Skeleton className="mt-6 h-9 w-32" />
      </Card>

      <Card className="mt-6 p-8">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
