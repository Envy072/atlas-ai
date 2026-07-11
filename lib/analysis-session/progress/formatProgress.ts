import { TOTAL_STAGES } from "@/lib/pipeline";
import type { ProgressSnapshot, StageName } from "@/lib/pipeline";

const STAGE_DISPLAY_NAMES: Record<StageName, string> = {
  research: "research",
  competitors: "competitors",
  market: "the market",
  financial: "the financials",
  business: "the business model",
  decision: "the decision summary",
};

function formatRemainingTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `about ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

// A friendly presentation over lib/pipeline's own ProgressSnapshot — no
// new math (MILESTONE_12_DESIGN.md Section 7). `currentStage` is
// undefined once nothing is left to name (completed/cancelled/failed).
// Returns a plain string, deliberately not embedded into
// AnalysisSessionSchema itself — that schema's own `progress` field
// stays Pipeline's raw ProgressSnapshot, unchanged (Section 10); this is
// a separate, optional presentation helper a caller reaches for only
// when it wants the label.
export function formatProgress(progress: ProgressSnapshot, currentStage?: StageName): string {
  const stageLabel = currentStage
    ? `Analyzing ${STAGE_DISPLAY_NAMES[currentStage]} (${progress.completedStages} of ${TOTAL_STAGES})`
    : `${progress.completedStages} of ${TOTAL_STAGES} complete`;

  if (progress.estimatedRemainingMs === undefined) return stageLabel;
  return `${stageLabel} — ${formatRemainingTime(progress.estimatedRemainingMs)} remaining`;
}
