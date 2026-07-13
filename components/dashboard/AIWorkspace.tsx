"use client";

import { useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { useAnalysisSession, isTerminalSessionState } from "@/hooks/useAnalysisSession";
import type { Project } from "@/lib/schemas/project";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [idea, setIdea] = useState("");
  const { view, status, error, start, cancel, retry } = useAnalysisSession();

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
            <AlertDescription>{error}</AlertDescription>
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
