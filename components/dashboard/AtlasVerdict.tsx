"use client";

import {
  BadgeCheck,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";

export default function AtlasVerdict() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm uppercase tracking-widest text-blue-100">
            Atlas Verdict
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            🟢 Recommended
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-100">
            Atlas believes this startup solves a meaningful problem with a
            realistic market opportunity. Execution quality will determine
            long-term success.
          </p>

        </div>

        <div className="rounded-3xl bg-white/10 p-6">

          <BadgeCheck className="h-16 w-16" />

        </div>

      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">

        <div className="rounded-2xl bg-white/10 p-5">

          <TrendingUp className="mb-3 h-7 w-7" />

          <h3 className="font-bold">
            Investment Potential
          </h3>

          <p className="mt-2 text-blue-100">
            High
          </p>

        </div>

        <div className="rounded-2xl bg-white/10 p-5">

          <TriangleAlert className="mb-3 h-7 w-7" />

          <h3 className="font-bold">
            Execution Risk
          </h3>

          <p className="mt-2 text-blue-100">
            Medium
          </p>

        </div>

        <div className="rounded-2xl bg-white/10 p-5">

          <BadgeCheck className="mb-3 h-7 w-7" />

          <h3 className="font-bold">
            Confidence
          </h3>

          <p className="mt-2 text-blue-100">
            91%
          </p>

        </div>

      </div>

    </section>
  );
}