"use client";

import { useAnalysisStore } from "@/lib/store/analysisStore";
import { Users, ShieldCheck } from "lucide-react";

export default function CompetitionCard() {
  const { analysis } = useAnalysisStore();

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <div>

        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Competition
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Competitive Analysis
        </h2>

        <p className="mt-3 text-gray-500">
          Atlas AI assessment of the competitive landscape.
        </p>

      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-xl bg-blue-100 p-3">

              <Users className="h-6 w-6 text-blue-600" />

            </div>

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

            <div className="rounded-xl bg-green-100 p-3">

              <ShieldCheck className="h-6 w-6 text-green-600" />

            </div>

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