-- Milestone 26: Project Persistence Architecture (MILESTONE_26_DESIGN.md
-- Section 3.7) — Migration A, additive only.
--
-- Split from the original single-file migration after the runtime
-- verification pass discovered the live `projects` table is NOT empty
-- (16 pre-existing, legacy-shaped rows) — contradicting the assumption
-- the original combined migration was written under. Dropping the
-- legacy `score`/`summary`/`problem`/`solution` columns in the same
-- migration would have permanently destroyed those 16 rows' data for no
-- functional gain (this milestone's code never reads those columns).
-- That removal is deliberately deferred to Migration B (see the
-- adjacent, separate, NOT-yet-approved-for-execution file), gated on an
-- explicit future product decision about what happens to those 16 rows.
--
-- This migration is purely additive: it adds the columns
-- persistProjectFromSession()/listProjects() require and the unique
-- index the immutability guarantee depends on, and touches nothing
-- else. Existing rows (including the 16 legacy ones) are completely
-- unaffected — every new column simply defaults to NULL for them, and
-- a unique index on a nullable column tolerates any number of NULLs in
-- Postgres (NULLs are never considered duplicates of each other), so
-- this creates zero risk against those rows.

alter table public.projects
  add column if not exists session_id text,
  add column if not exists execution_id text,
  add column if not exists owner_id uuid,
  add column if not exists profile jsonb,
  add column if not exists verification jsonb;

-- Backing the immutability requirement (MILESTONE_26_DESIGN.md Section
-- 3.2/4): one project per session, enforced at the database level so
-- persistProjectFromSession's insert-only write can rely on a unique-
-- violation error rather than a check-then-insert race.
create unique index if not exists projects_session_id_key
  on public.projects (session_id);

-- Intentionally NOT included in this migration (moved to Migration B,
-- not yet approved for execution):
--   - dropping score / summary / problem / solution
--   - adding NOT NULL constraints to the new columns (still unsafe
--     while the 16 legacy rows have them as NULL)
