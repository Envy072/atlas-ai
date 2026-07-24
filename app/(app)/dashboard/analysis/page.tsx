import { listProjects } from "@/lib/services/projects";
import { getCurrentUser } from "@/lib/services/auth";
import AIWorkspace from "@/components/dashboard/AIWorkspace";

// Stays fully public (Milestone 27's approved anonymous-analysis
// decision) — unlike /dashboard and /projects, this page must never
// redirect an anonymous visitor. Its History panel must also never
// leak another user's saved projects to them (Milestone 27c): when
// there's no authenticated user, listProjects() isn't called at all —
// an anonymous visitor gets an empty history, not everyone else's.
export default async function DashboardAnalysisPage() {
  const user = await getCurrentUser();
  const projects = user ? await listProjects(user.id) : [];

  return (
    <div className="p-4 md:p-6">
      <AIWorkspace projects={projects} />
    </div>
  );
}
