import { getCurrentUser } from "@/lib/services/auth";
import { formatDisplayName } from "@/lib/format";
import AppShell from "@/components/dashboard/shell/AppShell";

interface AppShellLayoutProps {
  children: React.ReactNode;
}

// Milestone 110 — the shared shell for every page that needs the
// persistent sidebar/header (Dashboard, AI Analysis, Projects, Reports,
// Competitors, Templates, Settings). Previously only app/dashboard's own
// layout.tsx applied AppShell, so navigating to any other sidebar
// destination stripped the shell entirely (Milestone 109 Fresh Cohesion
// Review, Critical Finding #1). This route group (app/(app)/) is stripped
// from the URL by Next.js convention — every page below kept its exact
// path; only its position in the file tree changed.
//
// Fetches the current user once here (originally MILESTONE_28_DESIGN.md
// Deliverable 4) so Header/ProfileMenu can show real identity. `user`
// being null is a legitimate, expected case (an anonymous visitor on the
// deliberately-public /dashboard/analysis, Milestone 27) — not an error.
// Deliberately a second getCurrentUser() call, independent of each page's
// own call — an accepted, documented trade-off (MILESTONE_28_DESIGN.md
// Section 10), not an oversight.
export default async function AppShellLayout({ children }: AppShellLayoutProps) {
  const authUser = await getCurrentUser();
  const user = authUser
    ? { email: authUser.email ?? "", displayName: formatDisplayName(authUser.email ?? "") }
    : null;

  return <AppShell user={user}>{children}</AppShell>;
}
