"use client";

import { useState } from "react";
import { useAnalysisStore } from "@/lib/store/analysisStore";

import AnalysisOverview from "./AnalysisOverview";
import MarketChart from "./MarketChart";
import CompetitionCard from "./CompetitionCard";
import BusinessModelCard from "./BusinessModelCard";
import RoadmapCard from "./RoadmapCard";

const tabs = [
  "Overview",
  "Market",
  "Competition",
  "Financial",
  "Roadmap",
];

export default function Tabs() {
  const [active, setActive] = useState("Overview");

  const { analysis } = useAnalysisStore();

  if (!analysis) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">

      <div className="flex flex-wrap gap-3 border-b border-gray-200 p-5">

        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`rounded-2xl px-6 py-3 font-medium transition-all duration-300 ${
              active === tab
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}

      </div>

      <div className="p-8">

        {active === "Overview" && (
          <AnalysisOverview />
        )}

        {active === "Market" && (
          <div className="space-y-8">

            <div>

              <h2 className="text-3xl font-bold">
                Market Intelligence
              </h2>

              <p className="mt-3 text-gray-500">
                AI market opportunity analysis.
              </p>

            </div>

            <MarketChart />

          </div>
        )}

        {active === "Competition" && (
          <CompetitionCard />
        )}

        {active === "Financial" && (
          <BusinessModelCard />
        )}

        {active === "Roadmap" && (
          <RoadmapCard />
        )}

      </div>

    </section>
  );
}