"use client";

import { useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { useAnalyzeStartup } from "@/hooks/useAnalyzeStartup";
import type { ProjectRecord } from "@/lib/services/projects";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import EmptyState from "@/components/shared/EmptyState";
import IdeaCommandCenter from "@/components/workspace/command-center/IdeaCommandCenter";
import AIThinkingExperience from "@/components/workspace/thinking/AIThinkingExperience";
import AnalysisReport from "@/components/workspace/report/AnalysisReport";
import ReportHistoryPanel from "@/components/workspace/history/ReportHistoryPanel";

interface AIWorkspaceProps {
  projects: ProjectRecord[];
}

// The AI analysis experience: command center → thinking state → report,
// with a real history panel alongside. The actual request lifecycle
// (idea/loading/analysis/error, and the analyze() call itself) is
// unchanged from before this milestone — only how each state is
// presented changed.
export default function AIWorkspace({ projects }: AIWorkspaceProps) {
  const [idea, setIdea] = useState("");
  const { analyze, loading, analysis, error } = useAnalyzeStartup();

  async function analyzeIdea() {
    await analyze(idea);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-8">
        <Card className="p-8">
          <IdeaCommandCenter
            idea={idea}
            onIdeaChange={setIdea}
            onSubmit={analyzeIdea}
            loading={loading}
          />
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && <AIThinkingExperience />}

        {!loading && !analysis && (
          <Card>
            <EmptyState
              icon={Sparkles}
              title="No analysis yet"
              description="Describe a startup idea above and Atlas AI will generate a full investor-grade report here."
            />
          </Card>
        )}

        {!loading && analysis && <AnalysisReport analysis={analysis} />}
      </div>

      <aside className="xl:sticky xl:top-6 xl:h-fit">
        <ReportHistoryPanel projects={projects} />
      </aside>
    </div>
  );
}
