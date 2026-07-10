"use client";

import { TrendingUp, Brain, FolderKanban } from "lucide-react";

export default function RightPanel() {
  return (
    <div className="space-y-6 p-6">

      <div className="rounded-3xl bg-blue-600 p-6 text-white">

        <p className="text-sm opacity-80">
          AI Score
        </p>

        <h2 className="mt-2 text-6xl font-bold">
          91
        </h2>

      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6">

        <div className="mb-3 flex items-center gap-3">
          <TrendingUp className="text-blue-600" />
          <h3 className="font-semibold">
            Market Confidence
          </h3>
        </div>

        <p className="text-3xl font-bold">
          96%
        </p>

      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6">

        <div className="mb-3 flex items-center gap-3">
          <Brain className="text-blue-600" />
          <h3 className="font-semibold">
            AI Status
          </h3>
        </div>

        <p className="text-gray-600">
          Ready for analysis.
        </p>

      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6">

        <div className="mb-3 flex items-center gap-3">
          <FolderKanban className="text-blue-600" />
          <h3 className="font-semibold">
            Projects
          </h3>
        </div>

        <p className="text-3xl font-bold">
          12
        </p>

      </div>

    </div>
  );
}