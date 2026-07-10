"use client";

import CountUp from "react-countup";
import {
  Brain,
  TrendingUp,
  ShieldAlert,
  Rocket,
} from "lucide-react";

const metrics = [
  {
    title: "AI Score",
    value: 91,
    suffix: "",
    icon: Brain,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Market Confidence",
    value: 88,
    suffix: "%",
    icon: TrendingUp,
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Risk Level",
    value: 24,
    suffix: "%",
    icon: ShieldAlert,
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Scalability",
    value: 95,
    suffix: "%",
    icon: Rocket,
    color: "bg-purple-50 text-purple-600",
  },
];

export default function AIMetrics() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div
            key={metric.title}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-2xl p-3 ${metric.color}`}>
                <Icon className="h-7 w-7" />
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                LIVE
              </span>
            </div>

            <p className="mt-8 text-sm text-gray-500">
              {metric.title}
            </p>

            <h2 className="mt-2 text-5xl font-bold">
              <CountUp
                end={metric.value}
                duration={1.5}
              />
              {metric.suffix}
            </h2>
          </div>
        );
      })}
    </div>
  );
}