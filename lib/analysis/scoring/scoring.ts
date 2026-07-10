// Pure, reusable scoring helpers. These exist independently of any single
// prompt so score handling stays testable and consistent even though, for
// now, the Investment Scoring stage is the only caller.

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function averageScores(scores: number[]): number {
  if (scores.length === 0) return 0;

  const total = scores.reduce((sum, score) => sum + score, 0);

  return Math.round(total / scores.length);
}

interface SubScores {
  marketScore?: number;
  productScore?: number;
  competitionScore?: number;
  executionScore?: number;
}

// Derives a fallback overall score from whichever sub-scores are present.
// Used to sanity-check (not necessarily override) the model's own
// top-level `score`, and as a fallback if that field is ever missing.
export function deriveOverallScore(subScores: SubScores): number | null {
  const values = Object.values(subScores).filter(
    (value): value is number => typeof value === "number"
  );

  if (values.length === 0) return null;

  return clampScore(averageScores(values));
}

export function deriveVerdict(score: number): string {
  if (score >= 80) return "Recommended";
  if (score >= 50) return "Proceed with Caution";
  return "Not Recommended";
}
