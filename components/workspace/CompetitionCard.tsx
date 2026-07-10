"use client";

import { useAnalysisStore } from "@/lib/store/analysisStore";
import { Users, ShieldCheck } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

export default function CompetitionCard() {
  const analysis = useAnalysisStore((state) => state.analysis);

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <SectionHeader
        eyebrow="Competition"
        heading="Competitive Analysis"
        description="Atlas AI assessment of the competitive landscape."
      />

      <div className="grid gap-6 lg:grid-cols-2">

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <IconBadge icon={Users} size="sm" />

            <h3 className="text-xl font-bold">
              Market Competition
            </h3>

          </div>

          <p className="leading-8 text-gray-600">
            {analysis.competition}
          </p>

        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <IconBadge
              icon={ShieldCheck}
              size="sm"
              bgClassName="bg-green-100"
              textClassName="text-green-600"
            />

            <h3 className="text-xl font-bold">
              Target Customers
            </h3>

          </div>

          <p className="leading-8 text-gray-600">
            {analysis.customers}
          </p>

        </div>

      </div>

    </section>
  );
}