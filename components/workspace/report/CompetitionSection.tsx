import { Swords } from "lucide-react";
import type { AnalysisResult } from "@/lib/schemas/analysis";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

interface CompetitionSectionProps {
  analysis: Pick<AnalysisResult, "competition">;
}

export default function CompetitionSection({ analysis }: CompetitionSectionProps) {
  return (
    <section id="section-competition" className="scroll-mt-6 space-y-6">
      <SectionHeader
        eyebrow="Competition"
        heading="Competitive Landscape"
        description="Who else is already solving this, and how defensible this idea is against them."
      />

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <IconBadge icon={Swords} size="sm" />
          <h3 className="text-lg font-bold text-card-foreground">Competitive Analysis</h3>
        </div>
        <p className="leading-7 text-muted-foreground">{analysis.competition}</p>
      </Card>
    </section>
  );
}
