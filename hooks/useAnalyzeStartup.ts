"use client";

import { useCallback, useState } from "react";
import { AnalysisResultSchema, type AnalysisResult } from "@/lib/schemas/analysis";

interface UseAnalyzeStartupCallbacks {
  onStart?: () => void;
  onSuccess?: (result: AnalysisResult) => void;
  onError?: (message: string) => void;
  onSettled?: () => void;
}

interface UseAnalyzeStartupResult {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyze: (idea: string) => Promise<AnalysisResult | null>;
}

// Shared by every idea-input surface (AIWorkspace, IdeaInput, ...) so the
// fetch/loading/error handling around POST /api/chat lives in one place.
// Callers that keep their own loading/analysis state (e.g. via the
// Zustand store) can ignore this hook's internal state and drive
// everything off the callbacks instead.
export function useAnalyzeStartup(
  callbacks?: UseAnalyzeStartupCallbacks
): UseAnalyzeStartupResult {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (idea: string) => {
      if (!idea.trim()) return null;

      setLoading(true);
      setError(null);
      setAnalysis(null);
      callbacks?.onStart?.();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: idea,
          }),
        });

        const data = await res.json();
        const parsed = AnalysisResultSchema.safeParse(data);

        if (!parsed.success) {
          throw new Error(
            data?.error ?? "Received an unexpected response from the analysis API."
          );
        }

        setAnalysis(parsed.data);
        callbacks?.onSuccess?.(parsed.data);

        return parsed.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";

        setError(message);
        callbacks?.onError?.(message);

        return null;
      } finally {
        setLoading(false);
        callbacks?.onSettled?.();
      }
    },
    [callbacks]
  );

  return { analysis, loading, error, analyze };
}
