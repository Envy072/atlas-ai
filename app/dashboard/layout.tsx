import AppShell from "@/components/dashboard/shell/AppShell";

interface DashboardSegmentLayoutProps {
  children: React.ReactNode;
}

// Wraps every route under /dashboard (Dashboard Home, AI Analysis) in the
// new shell. Other sidebar destinations (/projects, /research,
// /competitors, /reports, /templates, /settings) intentionally aren't
// wrapped yet — see DASHBOARD.md.
export default function DashboardSegmentLayout({ children }: DashboardSegmentLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
