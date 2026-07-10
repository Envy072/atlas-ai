import { BadgeCheck } from "lucide-react";
import type { AnalysisResult } from "@/lib/schemas/analysis";

interface VerdictSectionProps {
  analysis: Pick<AnalysisResult, "verdict" | "investment_decision" | "confidence">;
}

// The real final call — verdict/investment_decision/confidence straight
// from the model's response, not the hardcoded "always Recommended, 91%"
// AtlasVerdict.tsx used to show. AtlasVerdict.tsx itself is untouched and
// still exists; it's simply no longer rendered here now that this section
// shows the genuine equivalent.
export default function VerdictSection({ analysis }: VerdictSectionProps) {
  return (
    <section
      id="section-verdict"
      className="scroll-mt-6 rounded-3xl bg-gradient-to-br from-primary to-indigo-700 p-8 text-white shadow-lg"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm tracking-widest text-white/80 uppercase">Atlas Verdict</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">{analysis.verdict}</h2>
          <p className="mt-3 text-lg text-white/80">{analysis.investment_decision}</p>
        </div>

        <div className="shrink-0 rounded-3xl bg-white/10 p-6 text-center">
          <BadgeCheck className="mx-auto mb-2 h-8 w-8" />
          <p className="text-3xl font-bold">{analysis.confidence}%</p>
          <p className="mt-1 text-sm text-white/80">Confidence</p>
        </div>
      </div>
    </section>
  );
}
