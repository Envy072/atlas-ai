"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Named after the real stages documented in PIPELINE.md, condensed for
// on-screen readability (Problem Analysis + Business Model's "solution"
// half collapsed together, Risk + Opportunity paired, etc.).
const STAGES = [
  "Idea Analysis",
  "Problem & Solution",
  "Market Analysis",
  "Customer & Competition",
  "Business Model",
  "Risk & Opportunity",
  "Execution Roadmap",
  "Investment Scoring",
  "Final Report Assembly",
];

const STAGE_INTERVAL_MS = 2200;

// IMPORTANT — what this honestly represents: the live analyze flow is a
// single request (app/api/chat/route.ts calls the original single-call
// analyzeStartup service; the 11-stage pipeline in lib/analysis/ is built
// but not yet wired in — see PIPELINE.md's "Cutover Status"). There is no
// real per-stage completion signal to report today.
//
// Rather than fabricate one, this shows the pipeline's real stage names
// advancing on a fixed timer as an illustrative "here's roughly what's
// happening," and pairs it with an *indeterminate* Progress bar
// (value=null) specifically because a determinate one would claim a false
// precision we don't have. The parent (AIWorkspace) only mounts this
// component while `loading` is genuinely true (`{loading && <...>}`) and
// unmounts it the instant the real request resolves — this component
// itself never claims completion; it just stops existing.
export default function AIThinkingExperience() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((previous) => Math.min(previous + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">
          Atlas AI is analyzing your idea...
        </p>
      </div>

      <Progress value={null} className="mb-6" />

      <ul className="space-y-3">
        {STAGES.map((stage, index) => {
          const isDone = index < stageIndex;
          const isCurrent = index === stageIndex;

          return (
            <li key={stage} className="flex items-center gap-3 text-sm">
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
              )}

              <span
                className={
                  isCurrent
                    ? "font-medium text-foreground"
                    : isDone
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                }
              >
                {stage}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
