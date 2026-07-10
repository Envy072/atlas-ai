"use client";

import { Sparkles, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import IconBadge from "@/components/shared/IconBadge";
import AnalyzeButtonLabel from "@/components/shared/AnalyzeButtonLabel";
import SuggestionChips from "@/components/workspace/command-center/SuggestionChips";
import FutureInputActions from "@/components/workspace/command-center/FutureInputActions";

const SOFT_LENGTH_TARGET = 500;

interface IdeaCommandCenterProps {
  idea: string;
  onIdeaChange: (idea: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

// The premium replacement for the old plain textarea-plus-button block:
// example prompts, a live character counter, a clear button, and
// (non-functional, clearly-marked) affordances for future input methods.
// The actual submit mechanics are unchanged — this only changes how the
// same `idea`/`onIdeaChange`/`onSubmit` are presented.
export default function IdeaCommandCenter({
  idea,
  onIdeaChange,
  onSubmit,
  loading,
}: IdeaCommandCenterProps) {
  const isOverSoftTarget = idea.length > SOFT_LENGTH_TARGET;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <IconBadge icon={Sparkles} size="sm" />

        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Atlas AI Workspace
          </h2>
          <p className="text-muted-foreground">
            Describe your startup and let Atlas build your business.
          </p>
        </div>
      </div>

      <div className="relative">
        <Textarea
          value={idea}
          onChange={(e) => onIdeaChange(e.target.value)}
          placeholder="Example: I want to build an AI platform that helps refugees find jobs in the UK..."
          className="h-52 resize-none rounded-2xl p-6 pb-12 text-lg shadow-none"
        />

        {idea.length > 0 && (
          <button
            type="button"
            onClick={() => onIdeaChange("")}
            aria-label="Clear idea"
            className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="absolute bottom-4 left-6 flex items-center gap-3">
          <FutureInputActions />
        </div>

        <span
          className={
            "absolute bottom-4 right-6 text-xs tabular-nums " +
            (isOverSoftTarget ? "text-warning" : "text-muted-foreground")
          }
        >
          {idea.length} characters
        </span>
      </div>

      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <SuggestionChips onSelect={onIdeaChange} disabled={loading} />

        <Button
          onClick={onSubmit}
          disabled={loading}
          className="h-auto shrink-0 gap-2 rounded-2xl px-8 py-4 text-base"
        >
          <AnalyzeButtonLabel loading={loading} />
        </Button>
      </div>
    </div>
  );
}
