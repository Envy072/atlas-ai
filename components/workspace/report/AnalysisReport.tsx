import type { AnalysisResult } from "@/lib/schemas/analysis";
import ExecutiveSummarySection from "@/components/workspace/report/ExecutiveSummarySection";
import MarketSection from "@/components/workspace/report/MarketSection";
import CompetitionSection from "@/components/workspace/report/CompetitionSection";
import SwotSection from "@/components/workspace/report/SwotSection";
import BusinessModelSection from "@/components/workspace/report/BusinessModelSection";
import FinancialSection from "@/components/workspace/report/FinancialSection";
import RoadmapSection from "@/components/workspace/report/RoadmapSection";
import VerdictSection from "@/components/workspace/report/VerdictSection";
import ReportNav from "@/components/workspace/report/ReportNav";
import ReportActions from "@/components/workspace/report/ReportActions";

interface AnalysisReportProps {
  analysis: AnalysisResult;
}

// The investor-grade report. Every section below only reads the slice of
// `analysis` it actually needs (see each section's own Pick<...> prop
// type) and is independently mountable — today they all render together
// because the live API returns the full AnalysisResult in one response,
// but nothing here assumes that: a future streaming response could mount
// each section as its own data arrives without restructuring this file.
export default function AnalysisReport({ analysis }: AnalysisReportProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_180px]">
      <div className="min-w-0 space-y-8 lg:order-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Investor-grade report</p>
          <ReportActions />
        </div>

        <ExecutiveSummarySection analysis={analysis} />
        <MarketSection analysis={analysis} />
        <CompetitionSection analysis={analysis} />
        <SwotSection analysis={analysis} />
        <BusinessModelSection analysis={analysis} />
        <FinancialSection analysis={analysis} />
        <RoadmapSection analysis={analysis} />
        <VerdictSection analysis={analysis} />
      </div>

      <div className="lg:order-2">
        <div className="lg:sticky lg:top-6">
          <ReportNav />
        </div>
      </div>
    </div>
  );
}
