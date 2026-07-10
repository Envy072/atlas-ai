"use client";

import { Loader2 } from "lucide-react";

interface LoadingChecklistProps {
  title: string;
  items: string[];
}

// A vertical list of "spinner + label" rows shown while an analysis is in
// flight, used instead of hand-writing one row per step.
export default function LoadingChecklist({ title, items }: LoadingChecklistProps) {
  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
      <h3 className="mb-6 text-xl font-bold">
        {title}
      </h3>

      <div className="space-y-4 text-gray-700">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
