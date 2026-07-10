"use client";

import {
  TrendingUp,
  Target,
  Brain,
  Users,
  ArrowUpRight,
} from "lucide-react";

const stats = [
  {
    title: "Market Score",
    value: "91",
    subtitle: "+12% this week",
    icon: TrendingUp,
    color: "bg-blue-600 text-white",
    iconColor: "text-white",
  },
  {
    title: "Opportunities",
    value: "28",
    subtitle: "8 high potential",
    icon: Target,
    color: "bg-white",
    iconColor: "text-blue-600",
  },
  {
    title: "Competitors",
    value: "42",
    subtitle: "14 tracked today",
    icon: Users,
    color: "bg-white",
    iconColor: "text-blue-600",
  },
  {
    title: "AI Confidence",
    value: "96%",
    subtitle: "Excellent",
    icon: Brain,
    color: "bg-white",
    iconColor: "text-blue-600",
  },
];

export default function StatsCards() {
  return (
    <section className="mt-8">
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className={`rounded-3xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.color}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${
                      card.color.includes("blue")
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {card.title}
                  </p>

                  <h2 className="mt-4 text-5xl font-bold">
                    {card.value}
                  </h2>
                </div>

                <div
                  className={`rounded-2xl p-3 ${
                    card.color.includes("blue")
                      ? "bg-white/20"
                      : "bg-blue-50"
                  }`}
                >
                  <Icon className={`h-7 w-7 ${card.iconColor}`} />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <span
                  className={`text-sm ${
                    card.color.includes("blue")
                      ? "text-blue-100"
                      : "text-gray-500"
                  }`}
                >
                  {card.subtitle}
                </span>

                <ArrowUpRight
                  className={`h-5 w-5 ${
                    card.color.includes("blue")
                      ? "text-white"
                      : "text-blue-600"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}