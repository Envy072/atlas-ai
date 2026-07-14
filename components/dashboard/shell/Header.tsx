"use client";

import { Menu as MenuIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import NotificationsMenu from "@/components/dashboard/shell/NotificationsMenu";
import ProfileMenu, { type ProfileMenuUser } from "@/components/dashboard/shell/ProfileMenu";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  user: ProfileMenuUser | null;
}

export default function Header({ onOpenMobileMenu, user }: HeaderProps) {
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

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search projects and reports"
          placeholder="Search projects, reports, competitors..."
          className="bg-muted/40 pl-9 shadow-none focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <NotificationsMenu />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
