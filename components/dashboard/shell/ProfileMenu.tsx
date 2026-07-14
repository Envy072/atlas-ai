"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/lib/store/sessionStore";
import { isTerminalSessionState } from "@/hooks/useAnalysisSession";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from "@/components/ui/menu";
import ThemeToggle from "@/components/shared/ThemeToggle";

export interface ProfileMenuUser {
  email: string;
  displayName: string;
}

interface ProfileMenuProps {
  user: ProfileMenuUser | null;
}

// Shows the real signed-in user (MILESTONE_28_DESIGN.md Deliverable 2)
// — or, for an anonymous visitor (this shell also wraps the
// deliberately-public /dashboard/analysis, Milestone 27), an honest
// "Sign in" link instead of a fabricated identity or a broken menu.
//
// Both the "Sign out" action and the "Sign in" link check whether an
// analysis is actively in progress — reading lib/store/sessionStore.ts
// directly, the same store AIWorkspace already reads, computing the
// identical condition AIWorkspace calls "isBusy" — before navigating
// away, since either action would silently discard it. No new
// state-sharing mechanism; this is exactly what the existing Zustand
// store is for.
export default function ProfileMenu({ user }: ProfileMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useSessionStore((s) => s.status);
  const view = useSessionStore((s) => s.view);

  const isAnalysisInProgress =
    status === "starting" || (view !== null && !isTerminalSessionState(view.session.state));

  function confirmLeavingIfBusy(): boolean {
    if (!isAnalysisInProgress) return true;
    return window.confirm("You have an analysis in progress. Leaving now will lose it. Continue?");
  }

  async function handleSignOut() {
    if (!confirmLeavingIfBusy()) return;

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function handleSignInClick(e: MouseEvent) {
    if (!confirmLeavingIfBusy()) {
      e.preventDefault();
    }
  }

  if (!user) {
    return (
      <Link
        href={`/login?redirectTo=${encodeURIComponent(pathname)}`}
        onClick={handleSignInClick}
        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        Sign in
      </Link>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        aria-label="Open profile menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar>
          <AvatarFallback>{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </MenuTrigger>

      <MenuContent>
        <div className="flex flex-col px-3 py-1.5">
          <span className="font-medium text-foreground">{user.displayName}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
        </div>

        <MenuSeparator />

        <MenuItem render={<Link href="/settings" />}>
          <Settings className="h-4 w-4" />
          Settings
        </MenuItem>

        <MenuSeparator />

        <div className="flex items-center justify-between px-3 py-2 text-sm">
          <span>Theme</span>
          <ThemeToggle />
        </div>

        <MenuSeparator />

        <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
      </MenuContent>
    </Menu>
  );
}
