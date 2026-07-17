-- Milestone 39: Private Cohort Launch — "flag an incorrect result"
-- (MILESTONE_39_DESIGN.md Section 9, revised after Principal Architect
-- Review). Additive only; touches nothing on the existing `projects`
-- table.

create table if not exists public.analysis_flags (
  id uuid primary key default gen_random_uuid(),

  -- Subordinate to `projects` — RESTRICT, not CASCADE. This milestone
  -- exists to collect durable evidence of possible fabrication
  -- incidents (the roadmap's own "treated as a security incident, not
  -- an ordinary bug"). CASCADE would let deleting a project silently
  -- destroy that evidence, including in the one scenario that matters
  -- most: a project with an unresolved report against it. No
  -- project-deletion feature exists in this codebase today (`projects`
  -- itself has no DELETE policy at all), so this constraint has zero
  -- operational cost right now — it pre-commits to the safe default
  -- for whenever one is eventually built, matching this codebase's own
  -- existing precedent for the identical concern: `projects.owner_id`'s
  -- own FK to `auth.users` is `ON DELETE RESTRICT` for exactly this
  -- reason (supabase/migrations/20260714012231_project_ownership_rls.sql).
  project_id uuid not null references public.projects(id) on delete restrict,

  -- Nullable, and SET NULL rather than RESTRICT/CASCADE — a deliberate
  -- asymmetry with project_id above, not an inconsistency. project_id
  -- protects the report's traceability (never sever silently, since
  -- losing which project/analysis a report concerns destroys most of
  -- its evidentiary value). reporter_id protects only the report's
  -- attribution: if a reporter's account is ever deleted, the incident
  -- record — category, description, timestamp, and which project it
  -- concerns — must still survive; only the identity of who filed it
  -- is allowed to go.
  reporter_id uuid references auth.users(id) on delete set null,

  -- Fixed, closed taxonomy (lib/schemas/analysisFlag.ts is the single
  -- source of truth this mirrors) — enforced a second, independent
  -- time at the database layer, per CLAUDE.md Section 14.
  category text not null check (
    category in (
      'finding',
      'critical_risk',
      'investment_thesis',
      'recommendation',
      'verdict',
      'intelligence_data',
      'other'
    )
  ),

  -- Mirrors CreateAnalysisFlagInputSchema's own min(10)/max(2000) —
  -- deliberately both, same reasoning as the category CHECK above.
  description text not null check (char_length(description) between 10 and 2000),

  created_at timestamptz not null default now()
);

alter table public.analysis_flags enable row level security;

-- INSERT only. A founder may submit a flag against a project they own,
-- as themselves — both conditions checked in the same policy, matching
-- getProjectById()'s own application-layer ownership check
-- (lib/services/projects.ts), enforced here a second, independent time.
create policy "analysis_flags_insert_own"
  on public.analysis_flags
  for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.projects
      where public.projects.id = project_id
        and public.projects.owner_id = auth.uid()
    )
  );

-- Deliberately NO SELECT, UPDATE, or DELETE policy of any kind
-- (MILESTONE_39_DESIGN.md Section 9/13, revised after Principal
-- Architect Review). No application-layer feature reads this table —
-- the submission dialog's own confirmation state is derived entirely
-- from the INSERT's own response, never a subsequent query — so a
-- SELECT policy would be a real, unused grant, and an unused grant is
-- attack surface, not a convenience. With RLS enabled and no policy
-- for an operation, Postgres denies it by default for the
-- `authenticated`/`anon` roles; this is the correct, minimal grant,
-- not a gap. The team's own review of submitted flags happens via
-- Supabase's own dashboard/SQL editor, under the project's owner/
-- service-role credentials — a different access path entirely, not
-- governed by these policies, and therefore unaffected by their
-- absence. No policy for the `anon` role either — flagging requires
-- authentication, deliberately (an anonymous flag against a project
-- the submitter doesn't even own would be meaningless noise, not
-- signal).
