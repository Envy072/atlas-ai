"use client";

import { Loader2, Sparkles } from "lucide-react";

interface AnalyzeButtonProps {
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function AnalyzeButton({
  loading,
  onClick,
  disabled = false,
}: AnalyzeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Analyzing Startup...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
          <span>Analyze Startup</span>
        </>
      )}
    </button>
  );
}