import type { ProjectRecord } from "@/lib/services/projects";
import DashboardWelcome from "@/components/dashboard/home/DashboardWelcome";
import DashboardStats from "@/components/dashboard/home/DashboardStats";
import RecentProjectsPanel from "@/components/dashboard/home/RecentProjectsPanel";
import RecentActivityPanel from "@/components/dashboard/home/RecentActivityPanel";

interface DashboardHomeProps {
  projects: ProjectRecord[];
}

// Composes the Dashboard Home page. Takes already-fetched project data as
// a prop rather than fetching itself, so it stays a plain presentational
// component — app/dashboard/page.tsx (a Server Component) owns the actual
// services/projects.listProjects() call.
export default function DashboardHome({ projects }: DashboardHomeProps) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardWelcome />
      <DashboardStats projects={projects} />

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentProjectsPanel projects={projects} />
        <RecentActivityPanel projects={projects} />
      </div>
    </div>
  );
}
