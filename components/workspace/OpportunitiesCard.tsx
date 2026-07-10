"use client";

import { TrendingUp } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";

export default function OpportunitiesCard() {
  const { analysis } = useAnalysisStore();

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <div>

        <p className="text-sm font-semibold uppercase tracking-widest text-green-600">
          Opportunities
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Growth Opportunities
        </h2>

        <p className="mt-3 text-gray-500">
          Atlas AI identified the strongest opportunities for growth.
        </p>

      </div>

      <div className="space-y-5">

        {analysis.opportunities.map((opportunity, index) => (
          <div
            key={index}
            className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm"
          >

            <div className="flex items-start gap-4">

              <div className="rounded-2xl bg-green-100 p-3">

                <TrendingUp className="h-6 w-6 text-green-600" />

              </div>

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