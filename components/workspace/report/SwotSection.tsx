import { ThumbsUp, ThumbsDown, TrendingUp, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AnalysisResult } from "@/lib/schemas/analysis";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

interface SwotSectionProps {
  analysis: Pick<AnalysisResult, "strengths" | "weaknesses" | "opportunities" | "risks">;
}

interface QuadrantProps {
  title: string;
  icon: LucideIcon;
  bgClassName: string;
  textClassName: string;
  dotClassName: string;
  items: string[];
}

// dotClassName is a separate, literal prop (not derived from textClassName
// via string manipulation) so Tailwind's static scanner can actually see
// "bg-success"/"bg-warning"/etc. as real class names in the source —
// building it at runtime via .replace("text-", "bg-") would produce a
// class Tailwind never generated, rendering an invisible dot.
function Quadrant({ title, icon, bgClassName, textClassName, dotClassName, items }: QuadrantProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <IconBadge icon={icon} size="sm" bgClassName={bgClassName} textClassName={textClassName} />
        <h3 className="text-lg font-bold text-card-foreground">{title}</h3>
      </div>

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-sm leading-6 text-muted-foreground">
            <span className={`mt-2 h-1 w-1 shrink-0 rounded-full ${dotClassName}`} />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// SWOT, mapped onto the four real array fields AnalysisResult already
// has — "Threats" is presented from the existing `risks` field rather
// than inventing a separate threats field the schema doesn't have.
export default function SwotSection({ analysis }: SwotSectionProps) {
  return (
    <section id="section-swot" className="scroll-mt-6 space-y-6">
      <SectionHeader
        eyebrow="SWOT"
        heading="Strengths, Weaknesses, Opportunities & Threats"
        description="Atlas AI's structured assessment of this idea's position."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Quadrant
          title="Strengths"
          icon={ThumbsUp}
          bgClassName="bg-success/10"
          textClassName="text-success"
          dotClassName="bg-success"
          items={analysis.strengths}
        />
        <Quadrant
          title="Weaknesses"
          icon={ThumbsDown}
          bgClassName="bg-destructive/10"
          textClassName="text-destructive"
          dotClassName="bg-destructive"
          items={analysis.weaknesses}
        />
        <Quadrant
          title="Opportunities"
          icon={TrendingUp}
          bgClassName="bg-info/10"
          textClassName="text-info"
          dotClassName="bg-info"
          items={analysis.opportunities}
        />
        <Quadrant
          title="Threats"
          icon={ShieldAlert}
          bgClassName="bg-warning/15"
          textClassName="text-warning"
          dotClassName="bg-warning"
          items={analysis.risks}
        />
      </div>
    </section>
  );
}
