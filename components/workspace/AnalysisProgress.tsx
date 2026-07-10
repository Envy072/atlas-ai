"use client";

import {
  Brain,
  Search,
  Users,
  BarChart3,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const steps = [
  {
    title: "Understanding Idea",
    icon: Brain,
    completed: true,
  },
  {
    title: "Market Research",
    icon: Search,
    completed: true,
  },
  {
    title: "Competitor Analysis",
    icon: Users,
    completed: false,
    loading: true,
  },
  {
    title: "Business Model",
    icon: BarChart3,
    completed: false,
  },
];

export default function AnalysisProgress() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-bold">
        AI Progress
      </h2>

      <div className="grid grid-cols-4 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-500"
            >
              <div className="mb-4 flex items-center justify-between">
                <Icon className="h-6 w-6 text-blue-600" />

                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : step.loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border border-gray-300" />
                )}
              </div>

              <p className="font-semibold">
                {step.title}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}