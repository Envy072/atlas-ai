"use client";

import { CheckCircle2 } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";
import SectionHeader from "@/components/shared/SectionHeader";

export default function RoadmapCard() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <SectionHeader
        eyebrow="Roadmap"
        heading="Recommended Next Steps"
        description="Atlas AI recommends the following execution plan."
      />

      <div className="space-y-5">

        {analysis.next_steps.map((step, index) => (
          <div
            key={index}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold">

                {index + 1}

              </div>

              <div className="flex-1">

                <div className="mb-3 flex items-center gap-2">

                  <CheckCircle2 className="h-5 w-5 text-green-600" />

                  <h3 className="text-lg font-bold">
                    Step {index + 1}
                  </h3>

                </div>

                <p className="leading-8 text-gray-700">
                  {step}
                </p>

              </div>

            </div>

          </div>
        ))}

      </div>

      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">

        <h3 className="text-2xl font-bold">
          Execution Advice
        </h3>

        <p className="mt-4 leading-8 text-blue-100">
          Complete these milestones in order before scaling the business.
          Validate customer demand first, refine the product based on
          feedback, then focus on growth and fundraising.
        </p>

      </div>

    </section>
  );
}