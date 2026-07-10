import type { AnalysisResult } from "@/lib/schemas/analysis";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/shared/SectionHeader";
import ScoreBreakdown from "@/components/workspace/report/ScoreBreakdown";

interface FinancialSectionProps {
  analysis: Pick<
    AnalysisResult,
    "score" | "confidence" | "market_score" | "product_score" | "competition_score" | "execution_score"
  >;
}

// "Financial" here means the app's real financial-flavored signals
// (overall score, confidence, and — when present — the per-dimension
// sub-scores). AnalysisResult has no revenue/valuation projections to
// show, so none are invented.
export default function FinancialSection({ analysis }: FinancialSectionProps) {
  return (
    <section id="section-financial" className="scroll-mt-6 space-y-6">
      <SectionHeader
        eyebrow="Financial"
        heading="Score & Confidence Breakdown"
        description="Atlas AI's quantitative read on this idea's investment potential."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-card-foreground">Overall Score</h3>
          <div className="flex items-end gap-2">
            <span className="text-6xl font-bold tracking-tight text-foreground">
              {analysis.score}
            </span>
            <span className="mb-2 text-muted-foreground">/100</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Confidence: <span className="font-semibold text-foreground">{analysis.confidence}%</span>
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-card-foreground">Score Breakdown</h3>
          <ScoreBreakdown
            marketScore={analysis.market_score}
            productScore={analysis.product_score}
            competitionScore={analysis.competition_score}
            executionScore={analysis.execution_score}
          />
        </Card>
      </div>
    </section>
  );
}
