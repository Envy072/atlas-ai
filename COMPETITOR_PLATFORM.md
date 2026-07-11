# Atlas AI — Competitor Intelligence Platform

Milestone 6: Competitor Intelligence Platform. This document describes
`lib/competitors/` — Atlas AI's permanent, accumulating knowledge base for
companies and competitors. It is a platform, not a one-off analysis
feature: every future module this milestone anticipates (Market
Intelligence, Financial Intelligence, Investor Reports) is expected to
read and write through this same layer rather than building its own
company-data logic.

**Status: not wired into the application.** Nothing in `lib/analysis/`,
`lib/research/`, `lib/store/`, `app/api/`, or `lib/schemas/` imports from
`lib/competitors/` — those five paths are frozen this milestone and
remain completely unchanged. `lib/competitors/` is free-standing, and
consumes exactly one thing from outside itself: `lib/research`'s public
barrel (`runResearch`, and the `Source`/`Evidence` schemas/types it
exports) — never a deep import into `lib/research`'s internals, and never
a direct provider/search call of its own.

**Core principle, as given:** this platform must not depend on a single
analysis — a company's profile persists and improves across many
discovery runs, refreshes, and (eventually) many different founders'
sessions, rather than being recomputed from scratch every time someone
asks about a competitor.

---

## Why This Exists

Every prior milestone treated "who are the competitors" as a question
answered once, inside one analysis, and then discarded. That's wasteful
(the same competitor gets "discovered" fresh in every unrelated analysis
that happens to mention it) and it can't improve over time (each analysis
starts from zero knowledge instead of building on what a previous session
already learned).

The Competitor Intelligence Platform exists to fix that: a durable
`CompanyProfile` for every company Atlas AI has ever encountered, kept up
to date by a refresh lifecycle, resolved against duplicates by an entity
matcher, and exposed through reusable comparison and scoring objects that
any future feature can consume without re-deriving them.

---

## Architecture

Ten folders, each with exactly one job — the same "one layer, one
responsibility" convention `lib/research/` and `lib/services/` already
follow:

```
lib/competitors/
├── knowledge/    Builds and merges CompanyProfile records
├── discovery/    Turns a startup idea into candidate competitors
├── matcher/      Resolves duplicate companies to one entity
├── comparison/   Builds reusable, UI-agnostic comparison objects
├── scoring/      8-dimension competitor scorecards
├── refresh/      Decides when/why/how urgently to re-research a company
├── storage/      CompetitorKnowledgeStore interface + backends
├── schemas/      Every Zod schema — the single source of truth per shape
├── types/        Non-validated contracts (storage interface, matcher options)
└── utils/        Company-name normalization, URL dedupe helpers
```

### Data flow

```
CompetitorDiscovery.discoverCompetitors(startupIdea)
  │
  └─ lib/research.runResearch({ topic: "companies competing with: <idea>" })
        │
        └─ ResearchResult { sources, evidence, ... }   ← unmodified, frozen Research Engine
              │
              └─ discovery/candidateExtraction.extractCandidateName(source)  [heuristic]
                    │
                    └─ grouped into DiscoveredCompetitor[] (one per distinct candidate name)

For each accepted DiscoveredCompetitor:
  matcher.matchCompanyName(candidateName, existingProfiles)
    │
    ├─ matched   → knowledge.mergeCompanyProfile(existingProfile, newData)
    └─ unmatched → knowledge.buildCompanyProfile(newData)   [new CompanyProfile]
        │
        └─ storage.CompetitorKnowledgeStore.upsert(profile)

Later, on demand:
  scoring.scoreCompany(profile)        → CompetitorScore
  comparison.buildComparison(profiles, scores) → ComparisonMatrix
  refresh.collectStaleCompanies(profiles, now) → priority-ordered re-research queue
```

Nothing here is wired into a route or a Server Component yet — see
"Future Integration Plan" below.

---

## The Knowledge Model

`schemas/company.schema.ts`'s `CompanyProfile` is the one record this
whole platform exists to accumulate:

| Field | Notes |
|---|---|
| `id`, `name`, `aliases` | Identity — `aliases` grows every time the matcher/merger folds in a new name variant |
| `website`, `category`, `description`, `targetMarket`, `businessModel` | Descriptive, all optional until a real source reports them |
| `pricing` (`schemas/pricing.schema.ts`) | Structured tiers (`name`, `priceUsd`, `billingPeriod`) — never a guessed number |
| `features`, `technology` | String lists, unioned on every merge |
| `funding` (`schemas/funding.schema.ts`) | Total raised, last round, investors — empty until Crunchbase-class data exists |
| `strengths`, `weaknesses`, `opportunities`, `threats` | String lists, unioned on every merge |
| `sources`, `evidence` | **Reused from `lib/research`'s own `Source`/`Evidence` schemas** — never redefined here |
| `confidence` | 0-100, drives `refresh.refreshPriority` (see Refresh Lifecycle) |
| `refresh` (`schemas/refresh.schema.ts`) | `lastUpdated`, `nextRefresh`, `refreshReason`, `refreshPriority` — the four fields this milestone explicitly requires on every company |

A brand-new profile (`knowledge/companyProfileBuilder.ts`'s
`buildCompanyProfile`) starts with every list field empty and `confidence`
exactly as low as its first discovery run supports — never backfilled
with a guess. This is the same "never fabricate" discipline
`PROVIDER_MANAGER.md` established for source confidence, applied to
company data.

---

## Knowledge Lifecycle

1. **Discovery** produces a `DiscoveredCompetitor` — provisional, not yet
   a `CompanyProfile`.
2. **Matching** (`matcher.matchCompanyName`) checks it against every
   profile already in the store.
3. **Accumulation**:
   - No match → `knowledge.buildCompanyProfile` creates a brand-new
     record, `refreshReason: "initial_discovery"`.
   - Match → `knowledge.mergeCompanyProfile` folds the new data into the
     existing record: list fields (`aliases`/`features`/`strengths`/...)
     **union** rather than overwrite; `sources`/`evidence` union by URL
     (via `utils/urlNormalization.ts`'s `urlDedupeKey`, a dedicated,
     minimal helper — not a reach into `lib/research`'s internal
     `normalizeUrl`, which isn't part of its public barrel); `confidence`
     takes the newest read.
4. **Storage** — whoever calls discovery/matching persists the result via
   a `CompetitorKnowledgeStore` (`storage/`).

This is what "must accumulate knowledge over time" means concretely: the
same company gets *richer*, never *reset*, across repeated discovery runs.

---

## Refresh Lifecycle

Every `CompanyProfile.refresh` carries exactly the four fields this
milestone specifies:

- **`lastUpdated`** / **`nextRefresh`** — ISO timestamps.
- **`refreshReason`** — `initial_discovery` | `manual` | `scheduled` |
  `stale`.
- **`refreshPriority`** — `urgent` | `high` | `normal` | `low`, which sets
  how far out `nextRefresh` is scheduled (`refresh/refreshPolicy.ts`'s
  `REFRESH_INTERVAL_DAYS`: urgent = 1 day, high = 7, normal = 30, low =
  90).

`refresh/refreshPolicy.ts`'s `determineRefreshPriority(confidence)` is a
real (not placeholder) heuristic: a thin, low-confidence profile is
scheduled for an urgent re-check; a well-evidenced one can safely wait 90
days. `refresh/refreshEngine.ts` exposes the three lifecycles the
milestone asked for as pure functions (they return an updated profile;
they never write to a store themselves):

- `requestManualRefresh(profile, now)` — a human asked for fresh data
  right now; always jumps to `urgent`.
- `requestScheduledRefresh(profile, now)` — a recurring job's refresh;
  priority is recomputed from current confidence.
- `requestStaleRefresh(profile, now)` — re-researching because a profile
  was found overdue, not because anyone asked.
- `collectStaleCompanies(profiles, now)` — every profile whose
  `nextRefresh` has passed, sorted most-urgent first: the queue a future
  scheduled job would drain.

---

## Discovery Flow

`discovery/competitorDiscovery.ts`'s `discoverCompetitors(request)` is the
only function this folder exposes, and it does exactly one thing per this
milestone's explicit rule ("It must consume the existing Research Engine
only. Do not search directly."):

1. Builds a competitor-discovery-shaped query from the startup idea
   (`"companies competing with: <idea>"`) — a deliberately different
   string than the raw idea, since a literal idea description is a worse
   search query than a competitor-framed one.
2. Calls `runResearch()` — imported from `"@/lib/research"`, the frozen
   engine's own public barrel. This file never imports a provider, the
   `ProviderManager`, or anything under `lib/research/providers/`
   directly.
3. Groups the returned `sources`/`evidence` by a heuristically extracted
   candidate name (`discovery/candidateExtraction.ts`) — documented,
   deterministic, **not ML**: split a source's title on a `|`/`-`/`:`
   separator and take the first segment, falling back to a capitalized
   domain label. The same honesty standard as `PROVIDER_MANAGER.md`'s
   Brave position-based confidence heuristic: a genuine starting point,
   not a claim of NLP-grade entity extraction.
4. Returns a `CompetitorDiscoveryResult` — an honestly empty
   `candidates: []` when the Research Engine itself found nothing (true
   in any environment with no configured search-provider credentials,
   verified below), never a fabricated candidate.

Turning an accepted `DiscoveredCompetitor` into a persisted `CompanyProfile`
is the caller's job (via `matcher` + `knowledge`, see Knowledge Lifecycle)
— discovery itself never touches storage.

---

## Entity Matching

**Architecture only, no ML** — per this milestone's explicit rule.
`matcher/entityMatcher.ts`'s `matchCompanyName` is real, deterministic
code (not a stub), built from two passes:

1. **Normalized-name equality** (`utils/companyNormalization.ts`):
   lowercase, strip punctuation, collapse whitespace, and drop a trailing
   legal suffix (`Inc.`, `LLC`, `Ltd`, `Corp`, ...) — resolves "HubSpot"
   and "HubSpot Inc." to the same key outright.
2. **Collapsed-form equality**, then **Jaccard token overlap** as a
   fallback — resolves "Hub Spot" and "HubSpot" (same characters,
   different spacing/word-count, so their token sets alone don't overlap).

This is exactly the HubSpot / Hub Spot / HubSpot Inc. example from the
spec, and all three are verified to resolve to one entity (see
Verification). No embedding model, no fuzzy-matching library, no external
lookup — a future ML-based resolver can replace this function's body
wholesale without any caller changing, since every caller depends only on
the `(candidateName, existingProfiles) → CompanyMatchResult` contract.

---

## Comparison Flow

`comparison/comparisonEngine.ts`'s `buildComparison(profiles, scores?)`
renders the fixed eight-dimension set the milestone specifies — Features,
Pricing, Business Model, Target Market, Strengths, Weaknesses, Technology,
Market Position — into a `ComparisonMatrix`: one `ComparisonTable` per
dimension, one `ComparisonCell` per company, always a `values: string[]`
regardless of how differently-shaped the underlying `CompanyProfile` field
is (a pricing tier list and a single business-model string both render
down to the same generic shape). This is what makes it "reusable by future
UI" — a comparison grid component can render every dimension identically
without knowing anything about `CompanyProfile`'s internal structure.

`market_position` is the one dimension that isn't a direct `CompanyProfile`
field — it reads from an optional `CompetitorScore[]` parameter (produced
by the scoring engine), rendering as "Overall score: N/100", or empty if no
score was supplied. A profile has no opinion of its own market standing; a
score does.

---

## Scoring Engine

**Architecture only** — per this milestone's explicit rule ("No fake
scoring"). `scoring/scoringDimensions.ts` defines the eight required
dimensions (Innovation, Market Presence, Pricing, Product Breadth, Growth,
Funding, Technical Complexity, Brand Strength), each currently a function
that returns a fixed neutral `50`, exactly like Research Milestone 4's
`ranking/factors.ts` placeholders — honest rather than fake, because a
freshly-discovered `CompanyProfile` has no real signal yet for any of
these eight dimensions to compute from.

`scoring/scoringEngine.ts`'s `scoreCompany(profile)` is real composition
logic layered on top of those placeholders (equal-weighted, 12.5% each,
summing to a 0-100 `overallScore`) — the same "real composition over
not-yet-real inputs" pattern `rankSources()` established. Once a
placeholder dimension gets a real implementation, this function needs no
changes.

---

## Knowledge Storage

`types/storage.ts`'s `CompetitorKnowledgeStore` is the one interface every
backend implements (`getById`, `findByName`, `list`, `upsert`, `delete`) —
mirrors `lib/research/types/cache.ts`'s `ResearchCache` pattern exactly.

- **`storage/memoryStore.ts`** — `MemoryCompetitorStore`, a genuinely
  working in-process `Map`-backed store. The only real backend this
  milestone ships, for local development and single-instance use.
- **`storage/supabaseStore.ts`** — architecture only; every method throws
  a descriptive "not implemented yet" error. A real implementation would
  use the existing, unmodified `lib/supabase.ts` client.
- **`storage/postgresStore.ts`** — architecture only; for a future
  deployment running its own Postgres directly (e.g. a dedicated read
  replica for heavy comparison queries), bypassing Supabase's client.
- **`storage/vectorStore.ts`** — architecture only, future provider. Adds
  one vector-specific method (`findSimilarByDescription`) beyond the base
  interface, for a future Market Intelligence module to ask "which known
  companies are semantically similar to this new idea?"
- **`storage/createStore.ts`** — the single factory every caller depends
  on, mirroring `lib/research/cache/createCache.ts`; switching the default
  backend later is a one-line change here, not a rewrite of any caller.

---

## Schemas

Every shape in this platform is Zod-validated, one schema per shape, no
hand-duplicated types — `schemas/`:

- `enums.ts` — `CompetitorCategory`, `RefreshReason`, `RefreshPriority`,
  `ComparisonDimension`, `ScoringDimension`, `BillingPeriod`.
- `pricing.schema.ts`, `funding.schema.ts` — structured sub-shapes of
  `CompanyProfile`.
- `refresh.schema.ts` — the four-field `RefreshMetadata` shape.
- `company.schema.ts` — `CompanyProfile`, reusing `lib/research`'s own
  `Source`/`Evidence` schemas rather than redefining them.
- `matching.schema.ts` — `CompanyMatchResult`.
- `discovery.schema.ts` — `CompetitorDiscoveryRequest`/`Result`,
  `DiscoveredCompetitor`.
- `comparison.schema.ts` — `ComparisonCell`/`Table`/`Matrix`.
- `scoring.schema.ts` — `DimensionScore`, `CompetitorScore`.

---

## Verification

Exercised live via a temporary scratch route (`app/competitor-platform-
sanity-check/page.tsx`) against the running dev server, then deleted — the
same technique used for Milestones 4 and 5. 20/20 checks passed:

- `buildCompanyProfile` produces a schema-valid profile with correct
  `initial_discovery` refresh metadata.
- `determineRefreshPriority`/`computeNextRefresh` produce correct
  priorities and dates.
- `isStale`/`collectStaleCompanies` correctly identify and queue an
  overdue profile.
- `requestManualRefresh`/`requestScheduledRefresh` set the correct reason
  and priority.
- **The HubSpot / Hub Spot / HubSpot Inc. example from the spec resolves
  to one entity** — both `"HubSpot"` and `"Hub Spot"` correctly match the
  `"HubSpot Inc."` profile at 100 confidence, while an unrelated name
  (`"Salesforce"`) correctly does not match.
- `mergeCompanyProfile` unions feature lists without duplicating a
  shared entry across two successive merges.
- `discoverCompetitors` calls only `runResearch()` and returns a
  schema-valid, honestly empty `candidates: []` (no search-provider
  credentials are configured in this environment — see
  `PROVIDER_MANAGER.md`).
- `scoreCompany` produces all 8 required dimensions at the documented
  neutral placeholder, composing to an overall score of 50.
- `buildComparison` renders all 8 required dimensions across 2 companies,
  with `market_position` correctly reflecting a supplied score.
- `createStore()` defaults to `MemoryCompetitorStore`; it round-trips a
  profile by id and by case-insensitive name/alias.
- `SupabaseCompetitorStore` honestly throws rather than silently
  no-op-ing, confirming "architecture only" isn't secretly "fake success."

**Not verified:** a real multi-run accumulation scenario against a
persisted (non-memory) store, since no durable backend is implemented yet;
and discovery's candidate-extraction heuristic against real provider
responses, since no search-provider credentials exist in this environment
(see `PROVIDER_MANAGER.md`'s own equivalent caveat).

---

## Future Roadmap

- **Wire into the application.** Nothing calls `lib/competitors/` yet —
  a future milestone decides how discovery/storage plug into
  `app/competitors` (today a placeholder route) and the Analysis Pipeline.
- **Real scoring dimensions.** Replace each `scoring/scoringDimensions.ts`
  placeholder with a real signal source, per the roadmap already documented
  inline there (patent/feature-velocity data for Innovation, traffic/social
  signals for Market Presence, etc.).
- **Real storage backends.** Implement `SupabaseCompetitorStore` first
  (reuses the existing `lib/supabase.ts` client with zero new
  dependencies), then evaluate whether Postgres-direct or a vector store
  is actually needed once real usage patterns exist.
- **Market Intelligence module** (per this milestone's stated goal) reuses
  `CompanyProfile`/`CompetitorKnowledgeStore` directly instead of building
  its own company-data model — likely the first consumer of
  `VectorCompetitorStore.findSimilarByDescription`.
- **Financial Intelligence / Investor Reports** consume `funding`,
  `pricing`, and `CompetitorScore` off the same `CompanyProfile` records
  rather than re-researching companies a report has already covered.
- **Smarter candidate extraction.** `discovery/candidateExtraction.ts`'s
  title-splitting heuristic is a real starting point, not a ceiling — an
  LLM-based or NER-based extractor could replace it without changing
  `discoverCompetitors`'s contract.
- **A ProviderManager-style layer for discovery**, if a second discovery
  strategy (beyond "ask the Research Engine") ever emerges — not needed
  yet since there's exactly one strategy today.
