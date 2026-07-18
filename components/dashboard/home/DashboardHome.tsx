import type { Project } from "@/lib/schemas/project";
import type { SubscriptionTier } from "@/lib/schemas/subscription";
import DashboardWelcome from "@/components/dashboard/home/DashboardWelcome";
import DashboardAccountSummary from "@/components/dashboard/home/DashboardAccountSummary";
import DashboardStats from "@/components/dashboard/home/DashboardStats";
import RecentProjectsPanel from "@/components/dashboard/home/RecentProjectsPanel";
import RecentActivityPanel from "@/components/dashboard/home/RecentActivityPanel";

interface DashboardHomeProps {
  projects: Project[];
  displayName: string;
  tier: SubscriptionTier;
  analysesThisMonth: number;
}

// Composes the Dashboard Home page. Takes already-fetched project data as
// a prop rather than fetching itself, so it stays a plain presentational
// component — app/dashboard/page.tsx (a Server Component) owns the actual
// services/projects.listProjects() call (and, as of Milestone 45,
// getUserTier()/countProjectsThisMonth() too).
export default function DashboardHome({ projects, displayName, tier, analysesThisMonth }: DashboardHomeProps) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardWelcome displayName={displayName} />
      <DashboardAccountSummary tier={tier} analysesThisMonth={analysesThisMonth} />
      <DashboardStats projects={projects} />

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentProjectsPanel projects={projects} />
        <RecentActivityPanel projects={projects} />
      </div>
    </div>
  );
}
