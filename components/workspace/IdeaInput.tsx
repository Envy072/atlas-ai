"use client";

import { useAnalysisStore } from "@/lib/store/analysisStore";
import { useAnalyzeStartup } from "@/hooks/useAnalyzeStartup";
import { Loader2, Send, Sparkles } from "lucide-react";

export default function IdeaInput() {
  const {
    loading,
    analysis,
    setLoading,
    setAnalysis,
  } = useAnalysisStore();

  const { analyze } = useAnalyzeStartup({
    onStart: () => setLoading(true),
    onSuccess: (result) => setAnalysis(result),
    onError: (message) => console.error(message),
    onSettled: () => setLoading(false),
  });

  const idea = analysis?.idea ?? "";

  function setIdea(value: string) {
    setAnalysis({
      ...(analysis ?? {
        idea: "",
        summary: "",

        score: 0,

        verdict: "",
        investment_decision: "",
        confidence: 0,

        customers: "",

        problem: "",
        solution: "",

        market_size: "",
        competition: "",
        business_model: "",

        strengths: [],
        weaknesses: [],

        risks: [],
        opportunities: [],
        next_steps: [],
      }),

      idea: value,
    });
  }

  async function analyzeStartup() {
    await analyze(idea);
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-3">
          <Sparkles className="h-6 w-6 text-blue-600" />
        </div>

        <div>
          <h1 className="text-3xl font-bold">
            Atlas AI Workspace
          </h1>

          <p className="text-gray-500">
            Describe your startup and let Atlas build your business.
          </p>
        </div>
      </div>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={8}
        placeholder="Example: I want to build an AI platform that helps refugees find jobs in the UK..."
        className="w-full resize-none rounded-2xl border border-gray-200 p-6 text-lg outline-none transition focus:border-blue-600"
      />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Atlas AI will generate a complete startup analysis.
        </p>

        <button
          onClick={analyzeStartup}
          disabled={loading}
          className="flex items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Analyze Startup
            </>
          )}
        </button>
      </div>
    </section>
  );
}