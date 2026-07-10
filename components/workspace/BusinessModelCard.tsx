"use client";

import { Briefcase } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

export default function BusinessModelCard() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <SectionHeader
        eyebrow="Business Model"
        heading="Revenue Strategy"
        description="Atlas AI evaluation of the startup business model."
      />

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

        <div className="mb-6 flex items-center gap-4">

          <IconBadge icon={Briefcase} />

          <div>

            <h3 className="text-2xl font-bold">
              Business Model
            </h3>

            <p className="text-gray-500">
              Monetization & Growth Strategy
            </p>

          </div>

        </div>

        <div className="rounded-2xl bg-gray-50 p-6">

          <p className="leading-8 text-gray-700">
            {analysis.business_model}
          </p>

        </div>

      </div>

    </section>
  );
}