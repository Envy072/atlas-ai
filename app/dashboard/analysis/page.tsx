import { listProjects } from "@/lib/services/projects";
import AIWorkspace from "@/components/dashboard/AIWorkspace";

// listProjects() is the same, unmodified service Dashboard Home already
// calls — reused here (not changed) so the History panel shows real
// saved projects instead of nothing/fake data.
export default async function DashboardAnalysisPage() {
  const projects = await listProjects();

  return (
    <div className="p-4 md:p-6">
      <AIWorkspace projects={projects} />
    </div>
  );
}
