"use client";

import { Lightbulb } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

export default function SolutionCard() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <SectionHeader
        eyebrow="Solution"
        eyebrowClassName="text-green-600"
        heading="Proposed Solution"
        description="Atlas AI evaluation of the proposed product or service."
      />

      <div className="rounded-3xl border border-green-100 bg-white p-8 shadow-sm">

        <div className="mb-6 flex items-center gap-4">

          <IconBadge
            icon={Lightbulb}
            bgClassName="bg-green-100"
            textClassName="text-green-600"
          />

          <div>

            <h3 className="text-2xl font-bold">
              Solution Strategy
            </h3>

            <p className="text-gray-500">
              AI-generated solution overview
            </p>

          </div>

        </div>

        <div className="rounded-2xl bg-green-50 p-6">

          <p className="leading-8 text-gray-700">
            {analysis.solution}
          </p>

        </div>

      </div>

      <div className="grid gap-6 md:grid-cols-2">

        <div className="rounded-2xl border border-gray-200 bg-white p-6">

          <p className="text-sm text-gray-500">
            Target Customers
          </p>

          <p className="mt-3 leading-7 font-medium">
            {analysis.customers}
          </p>

        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">

          <p className="text-sm text-gray-500">
            AI Startup Score
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-600">
            {analysis.score}
          </p>

        </div>

      </div>

    </section>
  );
}