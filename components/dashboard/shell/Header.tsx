"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Menu as MenuIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/lib/store/sessionStore";
import { isTerminalSessionState } from "@/hooks/useAnalysisSession";
import NotificationsMenu from "@/components/dashboard/shell/NotificationsMenu";
import ProfileMenu, { type ProfileMenuUser } from "@/components/dashboard/shell/ProfileMenu";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  user: ProfileMenuUser | null;
}

// Real project search (MILESTONE_29_DESIGN.md Deliverable 7) — submits
// to /projects?q=<term>, which does the actual filtering. Guards the
// same way ProfileMenu already guards sign-in/sign-out
// (MILESTONE_28_DESIGN.md): submitting a search is also a navigation
// that could silently discard an in-progress analysis, so this checks
// the identical lib/store/sessionStore.ts condition before navigating
// away.
export default function Header({ onOpenMobileMenu, user }: HeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const status = useSessionStore((s) => s.status);
  const view = useSessionStore((s) => s.view);
  const isAnalysisInProgress =
    status === "starting" || (view !== null && !isTerminalSessionState(view.session.state));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (isAnalysisInProgress) {
      const shouldLeave = window.confirm(
        "You have an analysis in progress. Leaving now will lose it. Continue?"
      );
      if (!shouldLeave) return;
    }

    const trimmed = query.trim();
    router.push(trimmed ? `/projects?q=${encodeURIComponent(trimmed)}` : "/projects");
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open navigation"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <form onSubmit={handleSubmit} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search projects and reports"
          placeholder="Search projects, reports, competitors..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-muted/40 pl-9 shadow-none focus-visible:bg-background"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <NotificationsMenu />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
