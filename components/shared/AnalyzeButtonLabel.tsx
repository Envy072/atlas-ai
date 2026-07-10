"use client";

import { Loader2, Send } from "lucide-react";

interface AnalyzeButtonLabelProps {
  loading: boolean;
  loadingLabel?: string;
  idleLabel?: string;
}

// The spinner/icon + text swap shown inside the "Analyze Startup" button.
// Both idea-input surfaces render this exact pair of states; this just
// gives that pairing one definition instead of two.
export default function AnalyzeButtonLabel({
  loading,
  loadingLabel = "Analyzing...",
  idleLabel = "Analyze Startup",
}: AnalyzeButtonLabelProps) {
  if (loading) {
    return (
      <>
        <Loader2 className="h-5 w-5 animate-spin" />
        {loadingLabel}
      </>
    );
  }

  return (
    <>
      <Send className="h-5 w-5" />
      {idleLabel}
    </>
  );
}
