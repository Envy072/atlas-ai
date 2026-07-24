-- Milestone 107: Pipeline Execution Persistence (Milestone 104A ADR
-- Decision 4, Milestone 107's own approved concurrency design).
--
-- Unlike analysis_sessions (Milestone 106, fully flat — no jsonb payload
-- needed), PipelineExecutionSchema's context/stage_history/progress are
-- genuinely nested, platform-shaped objects that evolve additively and
-- independently of this table's own schema — stored as jsonb, mirroring
-- the same precedent projects.profile/verification already established
-- (Milestone 26). Every field this table's OWN logic actually queries or
-- guards on (state, version, updated_at) is a real, typed column instead.
create table if not exists public.pipeline_executions (
  id text primary key,
  startup_idea text not null,
  state text not null,
  current_stage_index integer not null,
  context jsonb not null,
  stage_history jsonb not null,
  progress jsonb not null,
  error_summary text null,
  -- Optimistic-concurrency guard (Milestone 107's approved concurrency
  -- design, Section 7). 0 only ever exists transiently, in memory,
  -- before the first successful write — buildInitialExecution()'s own
  -- starting value; the first real INSERT always persists version = 1.
  -- Every subsequent write is conditional: `UPDATE ... WHERE version =
  -- $expected`, incrementing by exactly one on success. This is what
  -- makes the cooperative-cancellation race Milestone 104C's Finding 1
  -- identified impossible: a stage-runner's own checkpoint can never
  -- silently clobber a concurrently-committed cancellation, because a
  -- write against a version that's already moved simply fails to match
  -- any row, rather than blindly overwriting it.
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The version-conditional write's own access pattern (`WHERE id = $1 AND
-- version = $2`) is already covered by the primary key alone — no
-- separate index needed for it. An index on (state, updated_at) supports
-- a future staleness sweep (Milestone 108's own scope, not this one) —
-- cheap to add now rather than as a second migration later.
create index if not exists pipeline_executions_state_updated_at_idx
  on public.pipeline_executions (state, updated_at);

-- RLS strategy — identical reasoning to analysis_sessions' own migration
-- (Milestone 106): pipeline executions are read/written by both
-- anonymous and signed-in callers (Milestone 27's approved
-- anonymous-analysis decision), and a stage-runner or a concurrent
-- cancelPipeline() call both act as a trusted server process with no
-- user session to carry — never a Postgres user context. Enabled with
-- zero policies for any role — a hard deny for direct client access. All
-- reads/writes go through the service-role admin client
-- (lib/supabase/admin.ts), which bypasses RLS entirely by design;
-- application code (sessionLifecycle.ts's ownerId check, reached via the
-- analysis_sessions row this execution is referenced from) remains the
-- true enforcement point.
alter table public.pipeline_executions enable row level security;
