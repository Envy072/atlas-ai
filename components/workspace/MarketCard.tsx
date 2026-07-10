"use client";

import { Globe } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

export default function MarketCard() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <SectionHeader
        eyebrow="Market Intelligence"
        heading="Market Opportunity"
        description="Atlas AI analysis of the market opportunity for this startup."
      />

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

        <div className="mb-6 flex items-center gap-4">

          <IconBadge icon={Globe} />

          <div>

            <h3 className="text-2xl font-bold">
              Market Size
            </h3>

            <p className="text-gray-500">
              Industry & Opportunity
            </p>

          </div>

        </div>

        <div className="rounded-2xl bg-gray-50 p-6">

          <p className="leading-8 text-gray-700">
            {analysis.market_size}
          </p>

        </div>

      </div>

      <div className="grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl border border-gray-200 bg-white p-6">

          <p className="text-sm text-gray-500">
            Customers
          </p>

          <p className="mt-3 font-semibold leading-7">
            {analysis.customers}
          </p>

        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">

          <p className="text-sm text-gray-500">
            Competition
          </p>

          <p className="mt-3 font-semibold leading-7">
            {analysis.competition}
          </p>

        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">

          <p className="text-sm text-gray-500">
            AI Score
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-600">
            {analysis.score}
          </p>

        </div>

      </div>

    </section>
  );
}