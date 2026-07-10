"use client";

import { AlertTriangle } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

export default function ProblemCard() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <SectionHeader
        eyebrow="Problem Analysis"
        eyebrowClassName="text-red-600"
        heading="Customer Problem"
        description="The core problem the startup aims to solve."
      />

      <div className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">

        <div className="mb-6 flex items-center gap-4">

          <IconBadge
            icon={AlertTriangle}
            bgClassName="bg-red-100"
            textClassName="text-red-600"
          />

          <div>

            <h3 className="text-2xl font-bold">
              Problem Statement
            </h3>

            <p className="text-gray-500">
              AI-generated market pain point
            </p>

          </div>

        </div>

        <div className="rounded-2xl bg-red-50 p-6">

          <p className="leading-8 text-gray-700">
            {analysis.problem}
          </p>

        </div>

      </div>

    </section>
  );
}