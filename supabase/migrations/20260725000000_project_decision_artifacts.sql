-- Milestone 115: Make Decision Artifacts Deterministic — additive only.
--
-- Adds a single nullable column to store the verdict/recommendations
-- computed once, at the moment a project is first persisted
-- (persistProjectFromSession), rather than recomputed via a fresh,
-- non-deterministic OpenAI call on every page render. Nullable because
-- existing rows predate this column and have no way to retroactively
-- recover what a since-changed model would have generated at the time
-- — those rows honestly show "not yet available" (the same empty state
-- already used when there is genuinely nothing to assemble a verdict
-- from), never a fabricated backfill. No UPDATE path is introduced
-- anywhere: `projects` remains insert-only, exactly as
-- MILESTONE_26_DESIGN.md's immutability requirement establishes — this
-- column is populated at insert time, once, like every other column on
-- this table, or left null forever for a row that predates it.

alter table public.projects
  add column if not exists decision_artifacts jsonb;
