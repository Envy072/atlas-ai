import { create } from "zustand";
import type { AnalysisResult } from "@/lib/schemas/analysis";

export type { AnalysisResult };

interface AnalysisStore {
  loading: boolean;
  analysis: AnalysisResult | null;

  setLoading: (loading: boolean) => void;
  setAnalysis: (analysis: AnalysisResult | null) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  loading: false,

  analysis: null,

  setLoading: (loading) =>
    set({
      loading,
    }),

  setAnalysis: (analysis) =>
    set({
      analysis,
    }),

  reset: () =>
    set({
      loading: false,
      analysis: null,
    }),
}));