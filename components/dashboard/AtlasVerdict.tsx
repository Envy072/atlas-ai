"use client";

import {
  BadgeCheck,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";

export default function AtlasVerdict() {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-primary to-indigo-700 p-8 text-white shadow-lg">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm tracking-widest text-white/80 uppercase">Atlas Verdict</p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight">🟢 Recommended</h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/80">
            Atlas believes this startup solves a meaningful problem with a
            realistic market opportunity. Execution quality will determine
            long-term success.
          </p>
        </div>

        <div className="shrink-0 rounded-3xl bg-white/10 p-6">
          <BadgeCheck className="h-16 w-16" />
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl bg-white/10 p-5 transition-colors duration-150 hover:bg-white/15">
          <TrendingUp className="mb-3 h-7 w-7" />
          <h3 className="font-bold">Investment Potential</h3>
          <p className="mt-2 text-white/80">High</p>
        </div>

        <div className="rounded-2xl bg-white/10 p-5 transition-colors duration-150 hover:bg-white/15">
          <TriangleAlert className="mb-3 h-7 w-7" />
          <h3 className="font-bold">Execution Risk</h3>
          <p className="mt-2 text-white/80">Medium</p>
        </div>

        <div className="rounded-2xl bg-white/10 p-5 transition-colors duration-150 hover:bg-white/15">
          <BadgeCheck className="mb-3 h-7 w-7" />
          <h3 className="font-bold">Confidence</h3>
          <p className="mt-2 text-white/80">91%</p>
        </div>
      </div>
    </section>
  );
}
