"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from "@/components/ui/menu";
import ThemeToggle from "@/components/shared/ThemeToggle";

// User identity is hardcoded ("Yasin / Founder") throughout the app today
// — there's no auth/session model yet (CLAUDE.md Roadmap Milestone 4).
// This menu reflects that honestly rather than fabricating account
// actions (like "Sign out") the app can't actually perform yet.
export default function ProfileMenu() {
  return (
    <Menu>
      <MenuTrigger
        aria-label="Open profile menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar>
          <AvatarFallback>Y</AvatarFallback>
        </Avatar>
      </MenuTrigger>

      <MenuContent>
        <div className="flex flex-col px-3 py-1.5">
          <span className="font-medium text-foreground">Yasin</span>
          <span className="text-xs font-normal text-muted-foreground">Founder</span>
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
      </MenuContent>
    </Menu>
  );
}
