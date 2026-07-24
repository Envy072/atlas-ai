-- Milestone 106: Analysis Session Persistence (Milestone 104A ADR,
-- Decision 4). Replaces the in-memory-only SessionRecord store with a
-- real, durable table.
--
-- Every column is a plain, typed column — no jsonb payload needed, since
-- SessionRecordSchema itself is already flat (id, execution_id, title,
-- startup_idea, owner_id, created_at, updated_at), unlike
-- pipeline_executions' own richer, nested shape (a later, separate
-- milestone).
create table if not exists public.analysis_sessions (
  id text primary key,
  execution_id text not null,
  title text not null,
  startup_idea text not null,
  owner_id uuid null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- For a future "my sessions" listing (ADR's own recommendation) — not
-- used by any live code path today (listSessions() is currently unused
-- by the app itself, confirmed at Milestone 104C), but cheap and
-- harmless to add now rather than as a second migration later.
create index if not exists analysis_sessions_owner_id_idx
  on public.analysis_sessions (owner_id);

-- RLS strategy (ADR Decision 4) — deliberately NOT the same shape as
-- projects' own `auth.uid() = owner_id` policy. Analysis sessions are
-- read/written by BOTH anonymous and signed-in callers (Milestone 27's
-- approved anonymous-analysis decision); the real access control is the
-- session id's own unguessability (Milestone 47's randomUUID()) plus an
-- application-layer ownerId check (sessionLifecycle.ts's
-- assertAccessible()) — never a Postgres user context, since an
-- anonymous caller has no auth.uid() to check against. A naive
-- `auth.uid() = owner_id` policy here would either break every
-- anonymous session outright, or (if loosened) provide no real
-- protection anyway.
--
-- Enabled with zero policies for anon/authenticated — a hard deny for
-- any direct client-side access. All reads/writes go through the
-- service-role admin client (lib/supabase/admin.ts), which bypasses RLS
-- entirely by design; application code is the true enforcement point.
alter table public.analysis_sessions enable row level security;
