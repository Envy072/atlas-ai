-- Milestone 47: API rate limiting (Milestone 46 Release Readiness
-- Review's second named finding). Fixed-window counters, one row per
-- (bucket_key, window_start) pair — additive only, touches no existing
-- table.

create table if not exists public.rate_limit_buckets (
  -- "{limitKey}:user:{userId}" or "{limitKey}:ip:{ip}" — the caller's
  -- identity is folded into the key itself rather than a separate
  -- column, since a fixed-window counter's whole job is "how many
  -- requests for this exact key, in this exact window."
  bucket_key text not null,

  -- The window's own start instant, pre-truncated by the caller
  -- (lib/services/rateLimit/checkRateLimit.ts) to its rule's
  -- windowSeconds — e.g. a 60s window truncates to the current minute.
  -- Storing the truncated instant (not just a duration) is what makes
  -- windows for the same bucket_key never collide across time.
  window_start timestamptz not null,

  request_count integer not null default 1,

  primary key (bucket_key, window_start)
);

alter table public.rate_limit_buckets enable row level security;

-- Deliberately NO policy of any kind for anon/authenticated on the
-- table itself — a rate limiter whose own subjects could read or write
-- their own counter row could simply reset or forge it, defeating the
-- limiter entirely (the same reasoning analysis_flags.sql already
-- applied to its own SELECT/UPDATE/DELETE gap, extended here to every
-- operation). All access goes through the function below instead.

-- The one, narrow, atomic operation any caller is allowed to perform:
-- increment this exact bucket_key's exact window by 1 and return the
-- new count. `security definer` runs this with the function owner's
-- privileges (bypassing the table's own RLS internally) — safe here
-- specifically because the function's own SQL is fixed and parameter-
-- ized (no dynamic SQL, no arbitrary read, no way to decrement/reset/
-- read another bucket) — a deliberately narrow "stored procedure with
-- elevated privilege," not a general bypass. This is why this
-- migration needs no admin/service-role client anywhere in application
-- code: the function itself is the security boundary, reachable from
-- the same cookie-aware client lib/services/stripe.ts and
-- lib/services/auth.ts already use (lib/supabase/server.ts).
create or replace function public.increment_rate_limit_bucket(
  p_bucket_key text,
  p_window_start timestamptz
) returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limit_buckets (bucket_key, window_start, request_count)
  values (p_bucket_key, p_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set request_count = rate_limit_buckets.request_count + 1
  returning request_count;
$$;

grant execute on function public.increment_rate_limit_bucket(text, timestamptz) to anon, authenticated;

-- Opportunistic cleanup — no cron/scheduled-job mechanism exists
-- anywhere in this codebase today, so this deletes rows for the exact
-- bucket_key just incremented, once its own window has long since
-- closed, on every call. Cheap (targeted by the primary key's own
-- leading column, not a full-table scan) and keeps the table from
-- growing unbounded without needing new infrastructure.
create or replace function public.cleanup_rate_limit_bucket(
  p_bucket_key text,
  p_older_than timestamptz
) returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_buckets
  where bucket_key = p_bucket_key
    and window_start < p_older_than;
$$;

grant execute on function public.cleanup_rate_limit_bucket(text, timestamptz) to anon, authenticated;
