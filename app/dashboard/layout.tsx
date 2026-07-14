import { getCurrentUser } from "@/lib/services/auth";
import { formatDisplayName } from "@/lib/format";
import AppShell from "@/components/dashboard/shell/AppShell";

interface DashboardSegmentLayoutProps {
  children: React.ReactNode;
}

// Wraps every route under /dashboard (Dashboard Home, AI Analysis) in the
// new shell. Other sidebar destinations (/projects, /research,
// /competitors, /reports, /templates, /settings) intentionally aren't
// wrapped yet — see DASHBOARD.md.
//
// Fetches the current user once here (MILESTONE_28_DESIGN.md
// Deliverable 4) so Header/ProfileMenu can show real identity. This
// layout wraps BOTH /dashboard (protected) and /dashboard/analysis
// (deliberately public, Milestone 27) — `user` being null here is a
// legitimate, expected case (an anonymous visitor), not an error.
// Deliberately a second getCurrentUser() call, independent of
// /dashboard's or /dashboard/analysis's own page-level call — an
// accepted, documented trade-off (MILESTONE_28_DESIGN.md Section 10),
// not an oversight.
export default async function DashboardSegmentLayout({ children }: DashboardSegmentLayoutProps) {
  const authUser = await getCurrentUser();
  const user = authUser
    ? { email: authUser.email ?? "", displayName: formatDisplayName(authUser.email ?? "") }
    : null;

  return <AppShell user={user}>{children}</AppShell>;
}
