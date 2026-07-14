import { redirect } from "next/navigation";
import { listProjects } from "@/lib/services/projects";
import { getCurrentUser } from "@/lib/services/auth";
import DashboardHome from "@/components/dashboard/home/DashboardHome";

// Already protected by middleware.ts (Milestone 27b) — this check
// (Milestone 27c) is not redundant defense-in-depth for its own sake,
// it's how this page gets the real user id listProjects() now requires
// (Milestone 27c: a project list is always scoped to one user, never
// "everyone's"). Never assumed present just because middleware ran.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await listProjects(user.id);

  return <DashboardHome projects={projects} />;
}
