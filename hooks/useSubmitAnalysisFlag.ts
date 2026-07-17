"use client";

import { useCallback, useRef, useState } from "react";
import { postJSON } from "@/lib/http/apiClient";
import { getErrorMessage } from "@/lib/errors";
import type { AnalysisFlagCategory } from "@/lib/schemas/analysisFlag";

export interface SubmitAnalysisFlagInput {
  projectId: string;
  category: AnalysisFlagCategory;
  description: string;
}

interface UseSubmitAnalysisFlagResult {
  status: "idle" | "submitting" | "success" | "error";
  error: string | null;
  submit: (input: SubmitAnalysisFlagInput) => Promise<void>;
  reset: () => void;
}

// Deliberately local component state (useState), not a Zustand store
// (MILESTONE_39_DESIGN.md Section 5) — this hook's own state belongs
// to exactly one component, FlagAnalysisDialog, read by nothing else;
// CLAUDE.md Section 7's own boundary for what qualifies as shared state
// doesn't apply here. Deliberately simpler than useAnalysisSession
// (no polling, no store, no cancel/retry) — a one-shot submission has
// no lifecycle beyond idle/submitting/success/error.
//
// submit() no-ops while already submitting — the hook-level guard
// behind the dialog's own disabled submit button (MILESTONE_39_DESIGN.md
// Section 6/7/12): a genuine double-click or a repeated click during an
// in-flight request cannot fire a second request through this hook,
// even if the UI-level disabled state were somehow bypassed. Guarded
// with a ref, not the `status` state value: a setState updater doesn't
// stop the rest of this async function from running, and reading
// `status` directly here would close over a stale value anyway (this
// callback's own identity is stable, matching useAnalysisSession's own
// ref+effect convention for exactly this class of problem) — a ref is
// read and written synchronously, so it correctly blocks a second call
// that arrives before the first one's own `finally` runs, no matter how
// close together they fire.
export function useSubmitAnalysisFlag(): UseSubmitAnalysisFlagResult {
  const [status, setStatus] = useState<UseSubmitAnalysisFlagResult["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const submit = useCallback(async (input: SubmitAnalysisFlagInput) => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setStatus("submitting");

    try {
      await postJSON("/api/analysis-flags", input);
      setStatus("success");
      setError(null);
    } catch (err) {
      setStatus("error");
      setError(getErrorMessage(err));
    } finally {
      submittingRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, submit, reset };
}
