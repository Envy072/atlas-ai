"use client";

import { Download, Share2, Copy, Bookmark, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface ReportAction {
  label: string;
  icon: LucideIcon;
}

const ACTIONS: ReportAction[] = [
  { label: "Export PDF", icon: Download },
  { label: "Share", icon: Share2 },
  { label: "Duplicate", icon: Copy },
  { label: "Save", icon: Bookmark },
  { label: "History", icon: History },
];

// UI-only — no export/share/duplicate/save/history backend exists yet.
// aria-disabled (not the native `disabled` attribute) so each button
// stays focusable and its "coming soon" tooltip is reachable by keyboard,
// not just mouse hover.
export default function ReportActions() {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Report actions (coming soon)">
      {ACTIONS.map((action) => (
        <Tooltip key={action.label}>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-disabled="true"
                onClick={(event) => event.preventDefault()}
                className="gap-1.5 opacity-70"
              />
            }
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </TooltipTrigger>
          <TooltipContent>{action.label} — coming soon</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
