-- Milestone 27c: Ownership Enforcement + RLS (MILESTONE_27_DESIGN.md /
-- Milestone 27c design review). Not run automatically by this
-- codebase — review and apply manually against the real project's own
-- Supabase instance, exactly like Migration A before it.
--
-- Prerequisite this migration assumes: lib/services/projects.ts now
-- queries through lib/supabase/server.ts's cookie-aware client, not the
-- deprecated anon-key lib/supabase.ts. Without that application-layer
-- change, auth.uid() below never resolves to a real user for this
-- table's queries, and the SELECT policy would deny everyone, including
-- the rightful owner — not a partial risk, a total one. Confirm that
-- code change shipped before applying this migration.
--
-- REVISED after Milestone 27c's own authenticated-flow root-cause
-- investigation. The live `projects` table was found (via the Supabase
-- Dashboard, not this migration) to already carry two pre-existing,
-- temporary policies, presumably created as an early placeholder before
-- real authentication existed:
--
--   "Allow anyone to insert projects" — to anon, with check (true)
--   "Allow anyone to read projects"   — to anon, using (true)
--
-- These are scoped to the `anon` Postgres role only. Postgres RLS
-- policies only apply to the role(s) named in their own TO clause — a
-- request from a signed-in user executes as the `authenticated` role
-- (Supabase Auth issues every session JWT with role: authenticated),
-- and with zero policies existing for that role, Postgres denies every
-- command by default, regardless of whether owner_id/auth.uid() would
-- otherwise match. This fully explained the investigation's exact
-- symptom: anon-key REST calls succeeded (anon's permissive policies
-- applied), while a real, correctly-authenticated user's own insert
-- failed with 42501 (no policy at all applied to their role). This
-- migration replaces those two placeholder policies outright — keeping
-- them alongside real ownership policies would also directly violate
-- "anonymous users cannot persist projects," since `with check (true)`
-- lets anon insert anything.

-- Enables the database-layer backstop for "users must never access
-- another user's projects" (MILESTONE_27_DESIGN.md Section 3.7, Layer
-- 2) — the application-layer .eq("owner_id", userId) filter in
-- listProjects() is Layer 1; neither replaces the other. Already
-- enabled on the live table today (the pre-existing anon policies
-- couldn't take effect otherwise) — kept here, idempotent, so this
-- migration is a complete, standalone description of the table's
-- intended state, not a diff assuming undocumented prior manual steps.
alter table public.projects enable row level security;

-- Remove the temporary, anon-scoped placeholder policies found on the
-- live table. Dropped outright, not left alongside the real policies
-- below — "with check (true)" for anon directly contradicts "anonymous
-- users cannot persist projects," and "using (true)" for anon directly
-- contradicts "authenticated users can only view their own projects"
-- (an anonymous reader could otherwise still read everyone's rows).
drop policy if exists "Allow anyone to insert projects" on public.projects;
drop policy if exists "Allow anyone to read projects" on public.projects;

-- A user may only ever see their own projects. Scoped explicitly `to
-- authenticated` — deliberately no policy of any kind for `anon` on
-- this table, so an anonymous request has zero applicable policies and
-- is denied by default, the same Postgres semantic that caused this
-- investigation's bug, now working in the intended direction instead of
-- against it.
create policy "projects_select_own" on public.projects
  for select
  to authenticated
  using (auth.uid() = owner_id);

-- A user may only ever insert a project attributed to themselves.
-- Scoped `to authenticated` for the same reason as the select policy —
-- anon has no insert policy at all, matching "anonymous users cannot
-- persist projects" at the database layer, not just in application
-- code (persistProjectFromSession already refuses to attempt this, but
-- this is the belt to that suspenders).
create policy "projects_insert_own" on public.projects
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

-- No UPDATE policy, deliberately: once RLS is enabled, omitting one
-- means Postgres denies all updates by default — the database-layer
-- expression of Milestone 26's own immutability guarantee (application
-- code already never issues an UPDATE; this is the backstop for that).
--
-- No DELETE policy either — deletion remains out of scope (Milestone 26
-- Non-Goals, unchanged).

-- Real referential integrity: an inserted owner_id must reference a
-- real auth.users row — safe against the 16 pre-existing legacy rows
-- (owner_id = NULL never violates a nullable foreign key).
--
-- ON DELETE RESTRICT, not CASCADE or SET NULL (see Milestone 27c design
-- review): account deletion isn't a feature yet, so this deliberately
-- forecloses nothing — a future deletion feature must make its own,
-- informed choice (export, explicit cascade, anonymize) rather than
-- inherit a silent, irreversible behavior decided before that feature
-- existed. RESTRICT simply blocks deleting a user who still has
-- projects, forcing that decision to be made explicitly when it's
-- actually needed.
alter table public.projects
  add constraint projects_owner_id_fkey
  foreign key (owner_id) references auth.users(id)
  on delete restrict;

-- Intentionally NOT included in this migration:
--   - NOT NULL on owner_id — the 16 legacy rows still have owner_id
--     NULL and would break it outright; stays exactly where
--     FUTURE_project_legacy_column_removal.sql already deferred it,
--     pending a separate decision about those rows.
--   - Any reassignment/deletion of the 16 legacy rows themselves — they
--     become permanently invisible under the SELECT policy above (an
--     already-named, expected consequence, not a new decision made
--     here).
--   - Any policy for the `anon` role — deliberate, see above.
