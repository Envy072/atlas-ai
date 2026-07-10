"use client";

import { AlertTriangle } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

export default function RisksCard() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <SectionHeader
        eyebrow="Risk Assessment"
        eyebrowClassName="text-red-600"
        heading="Startup Risks"
        description="Atlas AI identified the primary risks associated with this startup."
      />

      <div className="space-y-5">

        {analysis.risks.map((risk, index) => (
          <div
            key={index}
            className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm"
          >

            <div className="flex items-start gap-4">

              <IconBadge
                icon={AlertTriangle}
                size="md"
                bgClassName="bg-red-100"
                textClassName="text-red-600"
              />

              <div>

                <h3 className="font-bold text-lg">
                  Risk {index + 1}
                </h3>

                <p className="mt-2 leading-8 text-gray-700">
                  {risk}
                </p>

              </div>

            </div>

          </div>
        ))}

      </div>

    </section>
  );
}