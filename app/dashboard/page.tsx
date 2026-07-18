import { redirect } from "next/navigation";
import { listProjects, countProjectsThisMonth } from "@/lib/services/projects";
import { getCurrentUser } from "@/lib/services/auth";
import { getUserTier } from "@/lib/services/stripe";
import { formatDisplayName } from "@/lib/format";
import DashboardHome from "@/components/dashboard/home/DashboardHome";

// Already protected by middleware.ts (Milestone 27b) — this check
// (Milestone 27c) is not redundant defense-in-depth for its own sake,
// it's how this page gets the real user id listProjects() now requires
// (Milestone 27c: a project list is always scoped to one user, never
// "everyone's"). Never assumed present just because middleware ran.
//
// As of Milestone 45, also fetches tier/this-month's-analysis-count for
// DashboardAccountSummary — reusing the exact same
// getUserTier()/countProjectsThisMonth() calls the Usage page and the
// analysis-creation route already use, not a new data source.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Three independent reads, keyed only on user.id — run in parallel
  // rather than as a sequential waterfall, since none depends on
  // another's result.
  const [projects, tier, analysesThisMonth] = await Promise.all([
    listProjects(user.id),
    getUserTier(user.id),
    countProjectsThisMonth(user.id, new Date()),
  ]);

  return (
    <DashboardHome
      projects={projects}
      displayName={formatDisplayName(user.email ?? "")}
      tier={tier}
      analysesThisMonth={analysesThisMonth}
    />
  );
}
