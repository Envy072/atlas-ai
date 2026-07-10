"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnalysisResultSchema, type AnalysisResult } from "@/lib/schemas/analysis";
import { postJSON } from "@/lib/http/apiClient";
import { parseOrThrow } from "@/lib/validation/parse";
import { getErrorMessage } from "@/lib/errors";

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

  // Callers typically pass a fresh callbacks object every render; keeping
  // the latest one in a ref (rather than a useCallback dependency) means
  // `analyze` keeps a stable identity instead of being recreated each time.
  // The ref is synced in an effect (not during render) since `analyze` is
  // only ever invoked from event handlers, after effects have committed.
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const analyze = useCallback(async (idea: string) => {
    if (!idea.trim()) return null;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    callbacksRef.current?.onStart?.();

    try {
      const data = await postJSON<unknown>("/api/chat", { message: idea });
      const result = parseOrThrow(
        AnalysisResultSchema,
        data,
        "Received an unexpected response from the analysis API."
      );

      setAnalysis(result);
      callbacksRef.current?.onSuccess?.(result);

      return result;
    } catch (err) {
      const message = getErrorMessage(err);

      setError(message);
      callbacksRef.current?.onError?.(message);

      return null;
    } finally {
      setLoading(false);
      callbacksRef.current?.onSettled?.();
    }
  }, []);

  return { analysis, loading, error, analyze };
}
