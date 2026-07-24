import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors BillingPage's real shape (Milestone 45) — shown while
// getSubscriptionDetails()'s live Stripe lookup is in flight, matching
// app/dashboard/loading.tsx's own established pattern rather than a
// generic spinner.
export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <Skeleton className="h-9 w-32" />
      <div className="mt-2 mb-8 flex gap-1 border-b border-border pb-2.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Card className="p-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-9 w-36 rounded-lg" />
      </Card>
    </div>
  );
}
