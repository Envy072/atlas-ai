-- Milestone 125: Production Supabase Market & Competitor Stores.
--
-- Replaces the "ARCHITECTURE ONLY" SupabaseMarketStore/
-- SupabaseCompetitorStore (every method previously threw "not
-- implemented yet") with real tables — closing the Milestone 124 launch-
-- readiness finding that defaultMarketStore/defaultCompetitorStore were
-- silently in-memory-only, unlike every sibling store (analysis_sessions,
-- pipeline_executions).
--
-- One column per top-level MarketProfile/CompanyProfile field, typed
-- where the store's own logic actually queries or guards on it and jsonb
-- otherwise — the same convention pipeline_executions' own migration
-- established (Milestone 107), not a single opaque "data" blob column.
-- `analysis_id` is the only field either store's real query surface
-- (getByAnalysisId/findByName/list, all scoped by Milestone 116's own
-- analysisId isolation) ever filters on, so it's the one column besides
-- `id` promoted out of jsonb.

create table if not exists public.market_profiles (
  id text primary key,
  -- MarketProfileSchema's own analysisId is `.optional()` only for
  -- backward compatibility with profiles embedded inside an
  -- already-completed Project's own decision_artifacts/profile jsonb
  -- (Milestone 116's own schema comment) — that is a wholly separate
  -- table (projects), not this one. Every real write into this brand-new
  -- table comes from resolveMarketKnowledge() (lib/market/knowledge/
  -- marketResolver.ts), which always sets analysisId before calling
  -- store.upsert() — verified by reading both of its own call sites (the
  -- "unclassified" early return and the resolved/merged path) plus
  -- mergeMarketProfile's own MergeMarketProfileInput, which has no
  -- analysisId field to override, so a merge result always keeps the
  -- base profile's own value. NOT NULL is therefore correct here, unlike
  -- the Zod schema's own necessarily-looser `.optional()`.
  analysis_id text not null,
  industry text not null,
  sub_industry text null,
  sizing jsonb not null,
  customer_segments jsonb not null,
  geographic_markets jsonb not null,
  growth_rate jsonb null,
  market_maturity text null,
  regulations jsonb not null,
  risks jsonb not null,
  trends jsonb not null,
  sources jsonb not null,
  evidence jsonb not null,
  confidence numeric not null,
  refresh jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competitor_profiles (
  id text primary key,
  -- Same reasoning as market_profiles.analysis_id above: every real write
  -- comes from resolveCompetitorKnowledge() (lib/competitors/knowledge/
  -- competitorResolver.ts), which always sets analysisId — either
  -- directly (`{ ...buildCompanyProfile(...), analysisId }`) or via a
  -- merge whose MergeCompanyProfileInput likewise has no analysisId
  -- field, so the base profile's own value survives untouched.
  analysis_id text not null,
  name text not null,
  aliases jsonb not null,
  website text null,
  category text null,
  description text null,
  target_market text null,
  business_model text null,
  pricing jsonb null,
  features jsonb not null,
  funding jsonb null,
  technology jsonb not null,
  strengths jsonb not null,
  weaknesses jsonb not null,
  opportunities jsonb not null,
  threats jsonb not null,
  sources jsonb not null,
  evidence jsonb not null,
  confidence numeric not null,
  refresh jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The only real query pattern either store has (getByAnalysisId/
-- findByName/list, all filtering by analysis_id alone) — mirrors
-- analysis_sessions_owner_id_idx/pipeline_executions_state_updated_at_idx's
-- own "index the column the store's own logic actually filters on"
-- precedent.
create index if not exists market_profiles_analysis_id_idx
  on public.market_profiles (analysis_id);

create index if not exists competitor_profiles_analysis_id_idx
  on public.competitor_profiles (analysis_id);

-- RLS strategy — identical reasoning to analysis_sessions'/
-- pipeline_executions' own migrations (Milestones 106/107), for the same
-- underlying reason: neither MarketProfile nor CompanyProfile has ever
-- had a user-ownership concept (no owner_id/user_id field in either
-- schema), and both are written by a trusted server process (a pipeline
-- stage) with no end-user session to carry — there is no auth.uid() a
-- `to authenticated` policy could check here even in principle. The real
-- access boundary is that a caller must already possess a valid
-- analysisId, which is only ever supplied internally by pipeline stage
-- code, never accepted as raw, unauthenticated request input. Enabled
-- with zero policies for any role — a hard deny for direct client
-- access; all reads/writes go through the service-role admin client
-- (lib/supabase/admin.ts), which bypasses RLS entirely by design.
alter table public.market_profiles enable row level security;
alter table public.competitor_profiles enable row level security;
