"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { Menu, MenuTrigger, MenuContent } from "@/components/ui/menu";
import EmptyState from "@/components/shared/EmptyState";

// No notification system exists yet (that's a data/business-logic
// feature, out of scope for this design-system sprint) — this shows an
// honest empty state rather than fabricated notification data.
export default function NotificationsMenu() {
  return (
    <Menu>
      <MenuTrigger
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-4 w-4" />
      </MenuTrigger>

      <MenuContent>
        <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Notifications</p>
        <EmptyState
          icon={CheckCircle2}
          title="You're all caught up"
          description="New activity on your projects will show up here."
        />
      </MenuContent>
    </Menu>
  );
}
