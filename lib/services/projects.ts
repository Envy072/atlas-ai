import { createClient } from "@/lib/supabase/server";
import { ProjectSchema } from "@/lib/schemas/project";
import type { Project } from "@/lib/schemas/project";
import type { AnalysisSessionView } from "@/lib/schemas/analysisSessionView";

// Uses the cookie-aware server client (lib/supabase/server.ts) —
// required for RLS (MILESTONE_27_DESIGN.md / Milestone 27c). auth.uid(),
// which every RLS policy on this table keys on, only resolves to a real
// user id when the query is executed by a client carrying that
// request's own session; a client with no per-request identity would
// make the policies below evaluate false for everyone, including the
// rightful owner, not just deny wrongdoers. A second, deliberate,
// named exception to "services are framework-agnostic" (CLAUDE.md
// Section 8), alongside lib/services/auth.ts, for the same underlying
// reason: something has to read the request's cookies.

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
// /dashboard/analysis's History panel — always scoped to one specific
// user (Milestone 27c: "users must never access another user's
// projects"). Callers with no authenticated user must not call this at
// all (an empty list, decided at the call site) rather than pass a
// placeholder id here. Returns an empty list (and logs) on failure, or
// on any individually malformed row, rather than throwing — matching
// this file's own established tolerant-read convention.
//
// The .eq("owner_id", userId) filter is application-layer enforcement;
// the RLS policy on this table (supabase/migrations/) is the
// database-layer backstop for the same rule — deliberately both,
// neither replaces the other (CLAUDE.md Section 14).
export async function listProjects(userId: string): Promise<Project[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => fromRow(row as ProjectRow))
    .filter((project): project is Project => project !== null);
}

// The single-row counterpart to listProjects, for app/projects/[id]
// (MILESTONE_29_DESIGN.md Deliverable 2/3). The .eq("id", ...)
// .eq("owner_id", ...) pair is deliberate, not redundant: RLS's
// projects_select_own policy already prevents a non-owner's query from
// returning a row at the database level, but this file's own
// convention (CLAUDE.md Section 16) is to enforce the same rule at the
// application layer too, independently — neither layer replaces the
// other.
//
// A missing row, a malformed row, and a row owned by someone else are
// all indistinguishable `null` results here, on purpose: the caller
// must not be able to tell those three cases apart, so a guessed or
// enumerated id never reveals whether it belongs to someone else vs.
// not existing at all (MILESTONE_29_DESIGN.md Section 9,
// "Enumeration resistance").
export async function getProjectById(id: string, userId: string): Promise<Project | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase Error:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return fromRow(data as ProjectRow);
}

// The one and only write path for the `projects` table
// (MILESTONE_26_DESIGN.md Section 3.5). Called from
// lib/services/analysisSessions.ts's session-view composition — the
// sole caller — whenever a session view is observed, whether that's the
// moment it first completes or any later reopening of the same session.
//
// A no-op unless the session actually finished (mirrors AIWorkspace's
// own completion gate: state === "completed" with both a result and a
// verification summary present) — AND, as of Milestone 27c, unless a
// real, authenticated user is behind this call. "Saving a Project
// requires authentication" (the approved product decision) means
// exactly this: an anonymous completion is never persisted at all, not
// persisted with a null owner the way it was before this milestone.
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
export async function persistProjectFromSession(
  view: AnalysisSessionView,
  userId: string | null
): Promise<void> {
  const { session, verification } = view;

  if (session.state !== "completed" || !session.result || !verification || !userId) {
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
    ownerId: userId,
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

  const supabase = await createClient();
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
