import { CheckCircle2 } from "lucide-react";
import type { AnalysisResult } from "@/lib/schemas/analysis";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/shared/SectionHeader";

interface RoadmapSectionProps {
  analysis: Pick<AnalysisResult, "next_steps">;
}

export default function RoadmapSection({ analysis }: RoadmapSectionProps) {
  return (
    <section id="section-roadmap" className="scroll-mt-6 space-y-6">
      <SectionHeader
        eyebrow="Roadmap"
        heading="Recommended Next Steps"
        description="Atlas AI's suggested execution order, riskiest assumption first."
      />

      <Card className="p-6">
        <ol className="space-y-5">
          {analysis.next_steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <div className="flex-1 pt-1">
                <p className="leading-7 text-card-foreground">{step}</p>
              </div>
              <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
