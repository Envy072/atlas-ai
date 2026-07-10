"use client";

import { Briefcase } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";

export default function BusinessModelCard() {
  const { analysis } = useAnalysisStore();

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <div>

        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Business Model
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Revenue Strategy
        </h2>

        <p className="mt-3 text-gray-500">
          Atlas AI evaluation of the startup business model.
        </p>

      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

        <div className="mb-6 flex items-center gap-4">

          <div className="rounded-2xl bg-blue-100 p-4">

            <Briefcase className="h-7 w-7 text-blue-600" />

          </div>

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