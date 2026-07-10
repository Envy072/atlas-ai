"use client";

import { TrendingUp } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

export default function OpportunitiesCard() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <SectionHeader
        eyebrow="Opportunities"
        eyebrowClassName="text-green-600"
        heading="Growth Opportunities"
        description="Atlas AI identified the strongest opportunities for growth."
      />

      <div className="space-y-5">

        {analysis.opportunities.map((opportunity, index) => (
          <div
            key={index}
            className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm"
          >

            <div className="flex items-start gap-4">

              <IconBadge
                icon={TrendingUp}
                size="md"
                bgClassName="bg-green-100"
                textClassName="text-green-600"
              />

              <div>

                <h3 className="text-lg font-bold">
                  Opportunity {index + 1}
                </h3>

                <p className="mt-2 leading-8 text-gray-700">
                  {opportunity}
                </p>

              </div>

            </div>

          </div>
        ))}

      </div>

    </section>
  );
}