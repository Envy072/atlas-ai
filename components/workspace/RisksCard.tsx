"use client";

import { AlertTriangle } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";

export default function RisksCard() {
  const { analysis } = useAnalysisStore();

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <div>

        <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
          Risk Assessment
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Startup Risks
        </h2>

        <p className="mt-3 text-gray-500">
          Atlas AI identified the primary risks associated with this startup.
        </p>

      </div>

      <div className="space-y-5">

        {analysis.risks.map((risk, index) => (
          <div
            key={index}
            className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm"
          >

            <div className="flex items-start gap-4">

              <div className="rounded-2xl bg-red-100 p-3">

                <AlertTriangle className="h-6 w-6 text-red-600" />

              </div>

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