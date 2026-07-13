import { supabase } from "@/lib/supabase";

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
