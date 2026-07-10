"use client";

import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  ShieldCheck,
  Rocket,
} from "lucide-react";

import { useAnalysisStore } from "@/lib/store/analysisStore";

export default function ScoreCard() {
  const analysis = useAnalysisStore((state) => state.analysis);
  const loading = useAnalysisStore((state) => state.loading);

  const cards = [
    {
      title: "AI Score",
      value: analysis?.score ?? "--",
      subtitle: loading ? "Analyzing startup..." : "Overall Evaluation",
      icon: TrendingUp,
      featured: true,
    },
    {
      title: "Customers",
      value: analysis ? "Identified" : "--",
      subtitle: "Target Audience",
      icon: Users,
    },
    {
      title: "Market",
      value: analysis ? "Analyzed" : "--",
      subtitle: "Market Opportunity",
      icon: DollarSign,
    },
    {
      title: "Competition",
      value: analysis ? "Reviewed" : "--",
      subtitle: "Competitive Landscape",
      icon: Target,
    },
    {
      title: "Business",
      value: analysis ? "Validated" : "--",
      subtitle: "Business Model",
      icon: Rocket,
    },
    {
      title: "Risk",
      value: analysis ? "Calculated" : "--",
      subtitle: "Risk Assessment",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">

      {/* Hero Score */}

      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-2xl">

        <div className="flex items-start justify-between">

          <div>

            <p className="text-sm uppercase tracking-widest text-blue-100">
              Atlas AI Score
            </p>

            <h1 className="mt-3 text-7xl font-extrabold">
              {cards[0].value}
            </h1>

            <p className="mt-4 text-blue-100">
              {cards[0].subtitle}
            </p>

          </div>

          <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">

            <TrendingUp className="h-10 w-10" />

          </div>

        </div>

      </div>

      {/* Metrics */}

      <div className="space-y-4">

        {cards.slice(1).map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-lg"
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-4">

                  <div className="rounded-xl bg-blue-50 p-3">

                    <Icon className="h-5 w-5 text-blue-600" />

                  </div>

                  <div>

                    <h3 className="font-semibold text-gray-900">
                      {card.title}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {card.subtitle}
                    </p>

                  </div>

                </div>

                <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">

                  {card.value}

                </div>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}