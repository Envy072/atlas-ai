"use client";

import { Users } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";

export default function CustomersCard() {
  const { analysis } = useAnalysisStore();

  if (!analysis) return null;

  return (
    <section className="space-y-8">

      <div>

        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Target Customers
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Customer Profile
        </h2>

        <p className="mt-3 text-gray-500">
          Atlas AI identified the primary audience for this startup.
        </p>

      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

        <div className="mb-6 flex items-center gap-4">

          <div className="rounded-2xl bg-blue-100 p-4">

            <Users className="h-7 w-7 text-blue-600" />

          </div>

          <div>

            <h3 className="text-2xl font-bold">
              Ideal Customer
            </h3>

            <p className="text-gray-500">
              AI Generated Customer Segment
            </p>

          </div>

        </div>

        <div className="rounded-2xl bg-gray-50 p-6">

          <p className="leading-8 text-gray-700">
            {analysis.customers}
          </p>

        </div>

      </div>

      <div className="grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl border bg-white p-6">

          <p className="text-sm text-gray-500">
            Market
          </p>

          <p className="mt-3 font-semibold">
            {analysis.market_size}
          </p>

        </div>

        <div className="rounded-2xl border bg-white p-6">

          <p className="text-sm text-gray-500">
            Competition
          </p>

          <p className="mt-3 font-semibold">
            {analysis.competition}
          </p>

        </div>

        <div className="rounded-2xl border bg-white p-6">

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