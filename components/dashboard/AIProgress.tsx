"use client";

import {
  Brain,
  Search,
  Target,
  BarChart3,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const steps = [
  {
    title: "Understanding Idea",
    icon: Brain,
    done: true,
  },
  {
    title: "Market Research",
    icon: Search,
    done: true,
  },
  {
    title: "Competitor Analysis",
    icon: Target,
    done: true,
  },
  {
    title: "Business Model",
    icon: BarChart3,
    done: false,
  },
];

export default function AIProgress() {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-bold">
        AI Progress
      </h2>

      <div className="grid grid-cols-4 gap-4">

        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className="rounded-2xl border p-5 transition hover:border-blue-500"
            >
              <Icon className="mb-4 h-6 w-6 text-blue-600" />

              <p className="font-semibold">
                {step.title}
              </p>

              <div className="mt-6 flex justify-end">

                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}

              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}