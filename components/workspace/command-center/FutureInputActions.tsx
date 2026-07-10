"use client";

import { Paperclip, Link2, FileText } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const FUTURE_ACTIONS = [
  { label: "Attach a file", icon: Paperclip },
  { label: "Analyze a URL", icon: Link2 },
  { label: "Analyze a PDF", icon: FileText },
];

// UI-only affordances for input methods that don't exist yet (no backend
// support for files/URLs/PDFs — see PIPELINE.md/ARCHITECTURE.md). Kept
// focusable (not `disabled`) so the "coming soon" tooltip is reachable by
// keyboard, not just mouse hover — a real disabled attribute would make
// these invisible to keyboard/focus-based tooltip discovery.
export default function FutureInputActions() {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="More ways to analyze (coming soon)">
      {FUTURE_ACTIONS.map((action) => (
        <Tooltip key={action.label}>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-disabled="true"
                onClick={(event) => event.preventDefault()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-60 outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <action.icon className="h-4 w-4" />
            <span className="sr-only">{action.label}</span>
          </TooltipTrigger>
          <TooltipContent>{action.label} — coming soon</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
