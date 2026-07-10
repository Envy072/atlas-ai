import { supabase } from "@/lib/supabase";
import type { AnalysisResult } from "@/lib/schemas/analysis";

export interface ProjectRecord {
  id: string;
  created_at: string;
  title: string | null;
  score: number | null;
  summary: string | null;
  problem: string | null;
  solution: string | null;
  [key: string]: unknown;
}

// Persists a completed analysis as a project row. Mirrors the previous
// inline behavior in the API route: insert failures are logged, not
// thrown, since a persistence hiccup shouldn't fail the user-facing
// analysis response.
export async function createProject(analysis: AnalysisResult): Promise<void> {
  const { error } = await supabase.from("projects").insert({
    title: analysis.idea,
    score: analysis.score,
    summary: analysis.summary,
    verdict: analysis.verdict,
    investment_decision: analysis.investment_decision,
    confidence: analysis.confidence,
    customers: analysis.customers,
    problem: analysis.problem,
    solution: analysis.solution,
    market_size: analysis.market_size,
    competition: analysis.competition,
    business_model: analysis.business_model,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    risks: analysis.risks,
    opportunities: analysis.opportunities,
    next_steps: analysis.next_steps,
  });

  if (error) {
    console.error("Supabase Error:", error);
  }
}

// Reads the project list for the /projects page. Returns an empty list
// (and logs) on failure rather than throwing, matching the previous
// page's tolerant `projects?.map(...)` behavior.
export async function listProjects(): Promise<ProjectRecord[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
    return [];
  }

  return data ?? [];
}
