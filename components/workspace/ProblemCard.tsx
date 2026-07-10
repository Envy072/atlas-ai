"use client";

import { AlertTriangle } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";

export default function ProblemCard() {
  const { analysis } = useAnalysisStore();

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <div>

        <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
          Problem Analysis
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Customer Problem
        </h2>

        <p className="mt-3 text-gray-500">
          The core problem the startup aims to solve.
        </p>

      </div>

      <div className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">

        <div className="mb-6 flex items-center gap-4">

          <div className="rounded-2xl bg-red-100 p-4">

            <AlertTriangle className="h-7 w-7 text-red-600" />

          </div>

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