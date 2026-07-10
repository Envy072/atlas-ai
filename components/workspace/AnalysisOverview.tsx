"use client";

import { useAnalysisStore } from "@/lib/store/analysisStore";
import {
  Lightbulb,
  AlertTriangle,
  Target,
  Globe,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

function Section({
  icon: Icon,
  title,
  content,
}: {
  icon: LucideIcon;
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

      <div className="mb-5 flex items-center gap-3">

        <IconBadge icon={Icon} size="sm" />

        <h3 className="text-xl font-bold">
          {title}
        </h3>

      </div>

      <p className="leading-8 text-gray-600">
        {content}
      </p>

    </div>
  );
}

export default function AnalysisOverview() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-6">

      <SectionHeader
        eyebrow="Startup Overview"
        heading="Business Analysis"
      />

      <div className="grid gap-6 lg:grid-cols-2">

        <Section
          icon={AlertTriangle}
          title="Problem"
          content={analysis.problem}
        />

        <Section
          icon={Lightbulb}
          title="Solution"
          content={analysis.solution}
        />

        <Section
          icon={Globe}
          title="Market Size"
          content={analysis.market_size}
        />

        <Section
          icon={Target}
          title="Competition"
          content={analysis.competition}
        />

        <div className="lg:col-span-2">

          <Section
            icon={Briefcase}
            title="Business Model"
            content={analysis.business_model}
          />

        </div>

      </div>

    </section>
  );
}