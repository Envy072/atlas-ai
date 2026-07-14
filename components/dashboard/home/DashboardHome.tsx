import type { Project } from "@/lib/schemas/project";
import DashboardWelcome from "@/components/dashboard/home/DashboardWelcome";
import DashboardStats from "@/components/dashboard/home/DashboardStats";
import RecentProjectsPanel from "@/components/dashboard/home/RecentProjectsPanel";
import RecentActivityPanel from "@/components/dashboard/home/RecentActivityPanel";

interface DashboardHomeProps {
  projects: Project[];
  displayName: string;
}

// Composes the Dashboard Home page. Takes already-fetched project data as
// a prop rather than fetching itself, so it stays a plain presentational
// component — app/dashboard/page.tsx (a Server Component) owns the actual
// services/projects.listProjects() call.
export default function DashboardHome({ projects, displayName }: DashboardHomeProps) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardWelcome displayName={displayName} />
      <DashboardStats projects={projects} />

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentProjectsPanel projects={projects} />
        <RecentActivityPanel projects={projects} />
      </div>
    </div>
  );
}
