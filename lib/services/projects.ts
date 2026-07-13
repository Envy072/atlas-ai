import { supabase } from "@/lib/supabase";
import { ProjectSchema } from "@/lib/schemas/project";
import type { Project } from "@/lib/schemas/project";
import type { AnalysisSessionView } from "@/lib/schemas/analysisSessionView";

// Raw shape of a `projects` table row exactly as Postgres/Supabase
// returns it (snake_case columns) — never exposed past this file.
// Every other schema in this codebase (SessionRecordSchema,
// AnalysisSessionSchema, ...) uses camelCase; ProjectSchema follows that
// same convention, so this file is the one place the snake_case ↔
// camelCase mapping happens (MILESTONE_26_DESIGN.md Section 6, "Naming
// correction").
interface ProjectRow {
  id: string;
  session_id: string;
  execution_id: string;
  title: string;
  created_at: string;
  owner_id: string | null;
  profile: unknown;
  verification: unknown;
}

function fromRow(row: ProjectRow): Project | null {
  const result = ProjectSchema.safeParse({
    id: row.id,
    sessionId: row.session_id,
    executionId: row.execution_id,
    title: row.title,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    profile: row.profile,
    verification: row.verification,
  });

  if (!result.success) {
    console.error("Supabase Error: malformed projects row", row.id, result.error);
    return null;
  }

  return result.data;
}

// Reads the project list for /projects, /dashboard, and
// /dashboard/analysis's History panel. Returns an empty list (and logs)
// on failure, or on any individually malformed row, rather than
// throwing — matching this file's own established tolerant-read
// convention.
export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => fromRow(row as ProjectRow))
    .filter((project): project is Project => project !== null);
}

// The one and only write path for the `projects` table
// (MILESTONE_26_DESIGN.md Section 3.5). Called from
// lib/services/analysisSessions.ts's session-view composition — the
// sole caller — whenever a session view is observed, whether that's the
// moment it first completes or any later reopening of the same session.
//
// A no-op unless the session actually finished (mirrors AIWorkspace's
// own completion gate: state === "completed" with both a result and a
// verification summary present).
//
// IMMUTABILITY (MILESTONE_26_DESIGN.md Section 3.2/4, a binding
// requirement, not a preference): this function only ever calls
// `.insert()` — never `.upsert()` — and contains no `UPDATE` branch of
// any kind. `session_id` carries a unique constraint at the database
// level; a violation means a snapshot already exists for this session
// and is treated as a safe, expected no-op, not a failure. Reopening or
// re-polling an already-completed session therefore can never overwrite
// its stored snapshot. Any other Supabase error is logged and swallowed
// — a persistence hiccup must never fail the user-facing analysis
// response, matching this file's pre-existing error-handling
// convention.
export async function persistProjectFromSession(view: AnalysisSessionView): Promise<void> {
  const { session, verification } = view;

  if (session.state !== "completed" || !session.result || !verification) {
    return;
  }

  // safeParse, not parseOrThrow: this whole function must never throw
  // (it runs as a side effect of the read-only session-polling path) —
  // a malformed construction is logged and swallowed exactly like any
  // other persistence failure below, never allowed to fail the caller's
  // own, unrelated response.
  const result = ProjectSchema.safeParse({
    id: crypto.randomUUID(),
    sessionId: session.id,
    executionId: session.executionId,
    title: session.title,
    createdAt: session.updatedAt,
    ownerId: null,
    profile: session.result.profile,
    verification,
  });

  if (!result.success) {
    console.error("Supabase Error: could not construct a valid Project", result.error);
    return;
  }

  const project = result.data;

  const row: ProjectRow = {
    id: project.id,
    session_id: project.sessionId,
    execution_id: project.executionId,
    title: project.title,
    created_at: project.createdAt,
    owner_id: project.ownerId,
    profile: project.profile,
    verification: project.verification,
  };

  const { error } = await supabase.from("projects").insert(row);

  if (error) {
    if (error.code === "23505") {
      // Unique violation on session_id — a snapshot already exists for
      // this session. Expected under concurrent polling/reopening, not
      // a failure (Section 3.2).
      return;
    }
    console.error("Supabase Error:", error);
  }
}
