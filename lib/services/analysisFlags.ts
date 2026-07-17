import { createClient } from "@/lib/supabase/server";
import { getProjectById } from "@/lib/services/projects";
import type { CreateAnalysisFlagInput, AnalysisFlag } from "@/lib/schemas/analysisFlag";
import { AnalysisFlagSchema } from "@/lib/schemas/analysisFlag";
import { InvalidRequestError, ExternalServiceError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";

// Raw shape of an `analysis_flags` row exactly as Postgres/Supabase
// returns it (snake_case columns) — mirrors lib/services/projects.ts's
// own ProjectRow convention: every schema in this codebase uses
// camelCase, so this file is the one place the snake_case <-> camelCase
// mapping happens for this table.
interface AnalysisFlagRow {
  id: string;
  project_id: string;
  reporter_id: string | null;
  category: string;
  description: string;
  created_at: string;
}

// The one and only write path for the `analysis_flags` table
// (MILESTONE_39_DESIGN.md Section 5/9). Deliberately imports exactly
// one thing from the rest of this application's own domain layer —
// getProjectById, from lib/services/projects.ts, used strictly as a
// read to verify ownership. This file has zero import from
// lib/decision/ or lib/services/openai.ts and calls no discovery or
// generation function of any kind — the isolation from the decision
// pipeline this milestone's own design requires (Section 16, AC9-11)
// is a property of this file's own import list, not just a claim.
//
// A failed submission must surface as a real, visible error to the
// caller — unlike persistProjectFromSession's own "log and swallow"
// convention (a persistence hiccup there must not fail an unrelated
// user-facing analysis response), silently swallowing a failed
// incident report would be actively harmful to this milestone's own
// purpose (Section 11). This function throws on every failure path
// instead of logging and returning a fallback.
export async function submitAnalysisFlag(input: CreateAnalysisFlagInput, userId: string): Promise<AnalysisFlag> {
  // Ownership check — reuses getProjectById() unmodified, the same
  // enumeration-resistant application-layer check every other route
  // touching a project already performs, independent of and in
  // addition to the RLS policy on analysis_flags itself (CLAUDE.md
  // Section 14). A missing project and someone else's project are
  // indistinguishable here, on purpose.
  const project = await getProjectById(input.projectId, userId);

  if (!project) {
    throw new InvalidRequestError("This project could not be found.");
  }

  // Constructed and validated before the write, matching
  // persistProjectFromSession's own established convention for this
  // codebase's one other "insert a brand-new row" service function —
  // id and createdAt are generated here, app-side, not left to the
  // database's own column defaults.
  const flag = parseOrThrow(
    AnalysisFlagSchema,
    {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      reporterId: userId,
      category: input.category,
      description: input.description,
      createdAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid AnalysisFlag."
  );

  const row: AnalysisFlagRow = {
    id: flag.id,
    project_id: flag.projectId,
    reporter_id: flag.reporterId,
    category: flag.category,
    description: flag.description,
    created_at: flag.createdAt,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("analysis_flags").insert(row);

  if (error) {
    throw new ExternalServiceError("Supabase", "Could not submit this report. Please try again.");
  }

  return flag;
}
