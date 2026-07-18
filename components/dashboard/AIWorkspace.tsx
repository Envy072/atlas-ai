"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle } from "lucide-react";
import { useAnalysisSession, isTerminalSessionState } from "@/hooks/useAnalysisSession";
import { useToastManager } from "@/components/ui/toast";
import type { Project } from "@/lib/schemas/project";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import EmptyState from "@/components/shared/EmptyState";
import IdeaCommandCenter from "@/components/workspace/command-center/IdeaCommandCenter";
import SessionProgressExperience from "@/components/workspace/session/SessionProgressExperience";
import DecisionReport from "@/components/workspace/decision-report/DecisionReport";
import ReportHistoryPanel from "@/components/workspace/history/ReportHistoryPanel";

interface AIWorkspaceProps {
  projects: Project[];
}

// The AI analysis experience: command center → live session progress →
// decision report, with a real history panel alongside. Milestone 14
// replaced the legacy single-call useAnalyzeStartup flow with
// useAnalysisSession, wired to the real Pipeline/Analysis Session/
// Verification backend (MILESTONE_14_DESIGN.md) — only the data source
// and the report/loading components changed; this component's own
// composition role (input → loading/progress → result, history beside
// it) is unchanged.
export default function AIWorkspace({ projects }: AIWorkspaceProps) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const { view, status, error, start, cancel, retry } = useAnalysisSession();
  const toastManager = useToastManager();

  // ReportHistoryPanel's `projects` prop is fetched once, server-side, at
  // page-load time (app/dashboard/analysis/page.tsx) — analyzing an idea
  // happens entirely client-side (useAnalysisSession's polling), so
  // nothing re-runs that fetch on its own. router.refresh() re-executes
  // the Server Component tree for the current route (picking up the
  // project persistProjectFromSession just saved) without losing this
  // client component's own state (the in-progress/completed view stays
  // exactly as rendered) or scroll position — the minimal, correct tool
  // for this, not a full reload.
  useEffect(() => {
    if (view?.session.state === "completed") {
      router.refresh();
    }
  }, [view?.session.state, router]);

  // A toast is a genuine, additional signal beyond the in-place
  // progress→report swap already happening on this same page (Milestone
  // 45, Part 7) — most useful when the tab isn't in focus. Fires exactly
  // once per terminal state, not once per render: keyed on the session
  // id + state pair so a page refresh or reopening the same completed
  // session doesn't re-toast. sessionId/state are read into their own
  // variables (rather than the effect reading `view` directly) so the
  // dependency array below can list the two primitives that actually
  // matter instead of the whole `view` object, which changes identity
  // on every poll tick.
  const sessionId = view?.session.id;
  const sessionState = view?.session.state;

  // useToastManager() subscribes this component to the toast store, so
  // its return value gets a new identity every time any toast is
  // added/updated — including by this very effect. Listing toastManager
  // itself as a dependency therefore re-fires the effect every time it
  // calls .add(), which re-renders, which re-fires the effect: a real
  // infinite loop (caught live via "Maximum update depth exceeded"), not
  // a harmless one. Routed through a ref (same stable-identity pattern
  // as useAnalyzeStartup) so the effect below depends only on the two
  // primitives that should actually retrigger it.
  const toastManagerRef = useRef(toastManager);
  useEffect(() => {
    toastManagerRef.current = toastManager;
  }, [toastManager]);

  useEffect(() => {
    if (!sessionId || (sessionState !== "completed" && sessionState !== "failed")) return;

    const toastId = `session-${sessionId}-${sessionState}`;
    if (sessionState === "completed") {
      toastManagerRef.current.add({
        id: toastId,
        type: "success",
        title: "Analysis complete",
        description: "Your report is ready below.",
      });
    } else {
      toastManagerRef.current.add({
        id: toastId,
        type: "error",
        title: "Analysis failed",
        description: "Something went wrong generating this analysis.",
      });
    }
  }, [sessionId, sessionState]);

  async function analyzeIdea() {
    await start(idea);
  }

  const isBusy = status === "starting" || (view !== null && !isTerminalSessionState(view.session.state));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-8">
        <Card className="p-8">
          <IdeaCommandCenter idea={idea} onIdeaChange={setIdea} onSubmit={analyzeIdea} loading={isBusy} />
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription>{error.description}</AlertDescription>
          </Alert>
        )}

        {!view && (
          <Card>
            <EmptyState
              icon={Sparkles}
              title="No analysis yet"
              description="Describe a startup idea above and Atlas AI will generate a full investor-grade report here."
            />
          </Card>
        )}

        {view && view.session.state !== "completed" && (
          <SessionProgressExperience session={view.session} onCancel={cancel} onRetry={retry} />
        )}

        {view && view.session.state === "completed" && view.session.result && view.verification && (
          <DecisionReport profile={view.session.result.profile} verification={view.verification} />
        )}
      </div>

      <aside className="xl:sticky xl:top-6 xl:h-fit">
        <ReportHistoryPanel projects={projects} />
      </aside>
    </div>
  );
}
