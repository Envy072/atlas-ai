"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import AIMetrics from "./AIMetrics";
import AtlasVerdict from "./AtlasVerdict";
import MarketChart from "@/components/workspace/MarketChart";
import { useAnalyzeStartup } from "@/hooks/useAnalyzeStartup";
import AnalyzeButtonLabel from "@/components/shared/AnalyzeButtonLabel";
import LoadingChecklist from "@/components/shared/LoadingChecklist";

export default function AIWorkspace() {
  const [idea, setIdea] = useState("");
  const { analyze, loading, analysis } = useAnalyzeStartup({
    onError: (message) => console.error(message),
  });

  async function analyzeIdea() {
    await analyze(idea);
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

      {/* Header */}

      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-3">
          <Sparkles className="h-6 w-6 text-blue-600" />
        </div>

        <div>
          <h2 className="text-3xl font-bold">
            Atlas AI Workspace
          </h2>

          <p className="text-gray-500">
            Describe your startup and let Atlas build your business.
          </p>
        </div>
      </div>

      {/* Textarea */}

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Example: I want to build an AI platform that helps refugees find jobs in the UK..."
        className="h-52 w-full resize-none rounded-2xl border border-gray-200 p-6 text-lg outline-none transition focus:border-blue-600"
      />

      {/* Button */}

      <div className="mt-6 flex justify-end">
        <button
          onClick={analyzeIdea}
          disabled={loading}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <AnalyzeButtonLabel loading={loading} />
        </button>
      </div>

      {/* Loading */}

      {loading && (
        <LoadingChecklist
          title="🚀 Atlas is building your startup..."
          items={[
            "Understanding Idea",
            "Market Research",
            "Competitor Analysis",
            "Business Model",
            "Financial Projection",
            "Roadmap",
          ]}
        />
      )}

      {/* Result */}

      <AtlasVerdict />
      {analysis && (
  <div className="mt-8 space-y-8">

    {/* Executive Summary */}

    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Executive Summary
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {analysis.idea}
          </h1>

          <p className="mt-5 max-w-4xl text-lg leading-8 text-gray-600">
            {analysis.summary}
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl">

          <p className="text-blue-100">
            AI Score
          </p>

          <h2 className="mt-3 text-6xl font-bold">
            {analysis.score}
          </h2>

          <p className="mt-2 text-blue-100">
            Startup Potential
          </p>

        </div>

      </div>

    </div>

    {/* Metrics */}

    <AIMetrics />

    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">

      <div className="rounded-2xl border p-6">
        <p className="text-gray-500">Customers</p>
        <p className="mt-3 font-semibold">
          {analysis.customers}
        </p>
      </div>

      <div className="rounded-2xl border p-6">
        <p className="text-gray-500">Market</p>
        <p className="mt-3 font-semibold">
          {analysis.market_size}
        </p>
      </div>

      <div className="rounded-2xl border p-6">
        <p className="text-gray-500">Competition</p>
        <p className="mt-3 font-semibold">
          {analysis.competition}
        </p>
      </div>

      <div className="rounded-2xl border p-6">
        <p className="text-gray-500">Business Model</p>
        <p className="mt-3 font-semibold">
          {analysis.business_model}
        </p>
      </div>

    </div>

    <MarketChart />

    {/* Analysis */}

    <div className="grid gap-6 lg:grid-cols-2">

      <div className="rounded-2xl border p-7">
        <h2 className="mb-4 text-2xl font-bold">
          Problem
        </h2>

        <p className="leading-8 text-gray-600">
          {analysis.problem}
        </p>
      </div>

      <div className="rounded-2xl border p-7">
        <h2 className="mb-4 text-2xl font-bold">
          Solution
        </h2>

        <p className="leading-8 text-gray-600">
          {analysis.solution}
        </p>
      </div>

    </div>

  </div>
)}

    </div>
  );
}