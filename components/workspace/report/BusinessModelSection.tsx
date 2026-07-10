import { Briefcase, AlertTriangle, Lightbulb } from "lucide-react";
import type { AnalysisResult } from "@/lib/schemas/analysis";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

interface BusinessModelSectionProps {
  analysis: Pick<AnalysisResult, "business_model" | "problem" | "solution">;
}

export default function BusinessModelSection({ analysis }: BusinessModelSectionProps) {
  return (
    <section id="section-business-model" className="scroll-mt-6 space-y-6">
      <SectionHeader
        eyebrow="Business Model"
        heading="Problem, Solution & Monetization"
        description="How this idea makes money, and what it's solving in the first place."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <IconBadge icon={AlertTriangle} size="sm" bgClassName="bg-destructive/10" textClassName="text-destructive" />
            <h3 className="text-lg font-bold text-card-foreground">Problem</h3>
          </div>
          <p className="leading-7 text-muted-foreground">{analysis.problem}</p>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <IconBadge icon={Lightbulb} size="sm" bgClassName="bg-success/10" textClassName="text-success" />
            <h3 className="text-lg font-bold text-card-foreground">Solution</h3>
          </div>
          <p className="leading-7 text-muted-foreground">{analysis.solution}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <IconBadge icon={Briefcase} size="sm" />
          <h3 className="text-lg font-bold text-card-foreground">Business Model</h3>
        </div>
        <p className="leading-7 text-muted-foreground">{analysis.business_model}</p>
      </Card>
    </section>
  );
}
