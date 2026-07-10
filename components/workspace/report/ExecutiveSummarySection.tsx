import type { AnalysisResult } from "@/lib/schemas/analysis";
import { Card } from "@/components/ui/card";
import ScoreGauge from "@/components/workspace/report/ScoreGauge";

interface ExecutiveSummarySectionProps {
  analysis: AnalysisResult;
}

// Independently renderable: takes only the fields it needs from
// AnalysisResult, so this section could mount the moment its own slice of
// data is available in a future streaming response, without waiting on
// any other section.
export default function ExecutiveSummarySection({ analysis }: ExecutiveSummarySectionProps) {
  return (
    <Card id="section-summary" className="scroll-mt-6 p-8">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">
            Executive Summary
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">
            {analysis.idea}
          </h1>

          <p className="mt-5 max-w-4xl text-lg leading-8 text-muted-foreground">
            {analysis.summary}
          </p>
        </div>

        <div className="shrink-0">
          <ScoreGauge score={analysis.score} label="Startup Potential" />
        </div>
      </div>
    </Card>
  );
}
