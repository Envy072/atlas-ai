import { listProjects } from "@/lib/services/projects";
import DashboardHome from "@/components/dashboard/home/DashboardHome";

export default async function DashboardPage() {
  const projects = await listProjects();

  return <DashboardHome projects={projects} />;
}
