"use client";

import { Progress } from "@/components/ui/progress";

interface ScoreBreakdownProps {
  marketScore?: number;
  productScore?: number;
  competitionScore?: number;
  executionScore?: number;
}

const DIMENSIONS = [
  { key: "marketScore", label: "Market" },
  { key: "productScore", label: "Product" },
  { key: "competitionScore", label: "Competition" },
  { key: "executionScore", label: "Execution" },
] as const;

// The four sub-scores are optional on AnalysisResult because the live
// single-call analyze path doesn't currently populate them (see
// ARCHITECTURE.md). Rather than invent values, this only renders the
// dimensions that are genuinely present, with an honest note when none
// are — never a fake 0 or placeholder bar.
//
// Radar-ready: this data shape (a label + a 0-100 value per dimension) is
// exactly what a future <RadarChart radar-series> would consume directly
// — swapping these bars for a radar chart later needs no data reshaping,
// only a different chart component reading the same `available` array.
export default function ScoreBreakdown({
  marketScore,
  productScore,
  competitionScore,
  executionScore,
}: ScoreBreakdownProps) {
  const values = { marketScore, productScore, competitionScore, executionScore };
  const available = DIMENSIONS.filter((dimension) => typeof values[dimension.key] === "number");

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Dimension-level scoring (market, product, competition, execution) isn&apos;t
        available for this analysis yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {available.map((dimension) => {
        const value = values[dimension.key] as number;

        return (
          <div key={dimension.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{dimension.label}</span>
              <span className="text-muted-foreground">{value}/100</span>
            </div>
            <Progress value={value} />
          </div>
        );
      })}
    </div>
  );
}
