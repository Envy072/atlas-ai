-- Milestone 44: Full Stripe Integration & Automated Metering
-- (MILESTONE_44_DESIGN.md). One row per user who has ever completed a
-- real Stripe checkout — a user with no row here is on the Free tier by
-- definition (getUserTier() in lib/services/stripe.ts treats "no row"
-- and "row with status != 'active'" identically as free). No migration
-- backfills a row for every existing user; the only write path is the
-- Stripe webhook handler, via the service-role client
-- (lib/supabase/admin.ts), which is never subject to the RLS policy
-- below.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'founder')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due')),
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unlike projects.owner_id's ON DELETE RESTRICT (which deliberately
-- protects project data from silent loss), a subscription record has no
-- standalone value once its owning account is gone, and account
-- deletion isn't a feature yet either way — CASCADE is the simpler,
-- correct choice here (MILESTONE_44_DESIGN.md Database Impact).
--
-- RLS: enabled with exactly one policy, SELECT-only, so a signed-in
-- user can read their own tier/status (e.g. for account-page UI) but
-- can never write to this table themselves — every write happens
-- exclusively through the webhook handler's service-role client, which
-- bypasses RLS by design. This mirrors analysis_flags' own
-- "one narrow policy, everything else denied by default" shape
-- (Milestone 39), inverted (there: insert-only for users; here:
-- select-only for users).
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);
