"use client";

import { Sparkles, Clock3 } from "lucide-react";
import { useAnalysisStore } from "@/lib/store/analysisStore";

export default function WorkspaceHeader() {
  const analysis = useAnalysisStore((state) => state.analysis);
  const loading = useAnalysisStore((state) => state.loading);

  return (
    <section className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-xl">

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur">

            <Sparkles className="h-5 w-5" />

            <span className="text-sm font-semibold">
              Atlas AI Workspace
            </span>

          </div>

          <h1 className="text-4xl font-bold">
            Startup Intelligence Platform
          </h1>

          <p className="mt-4 max-w-3xl text-blue-100 leading-8">
            Describe your startup idea and Atlas AI will generate an
            investor-grade business analysis including market research,
            competition, risks, opportunities and execution roadmap.
          </p>

        </div>

        <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">

          <div className="flex items-center gap-3">

            <Clock3 className="h-6 w-6" />

            <div>

              <p className="text-sm text-blue-100">
                Status
              </p>

              <h3 className="text-xl font-bold">
                {loading
                  ? "Analyzing..."
                  : analysis
                  ? "Analysis Ready"
                  : "Waiting"}
              </h3>

            </div>

          </div>

          <div className="mt-6">

            <p className="text-sm text-blue-100">
              AI Score
            </p>

            <h2 className="mt-2 text-5xl font-extrabold">

              {analysis?.score ?? "--"}

            </h2>

          </div>

        </div>

      </div>

    </section>
  );
}