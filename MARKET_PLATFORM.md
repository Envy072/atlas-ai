# Atlas AI — Market Intelligence Platform

Milestone 7: Market Intelligence Platform. This document describes
`lib/market/` — Atlas AI's permanent, accumulating knowledge base for
market information (industry sizing, segments, geography, trends,
regulation, risk), sitting alongside `lib/competitors/` (Milestone 6) as
the second reusable knowledge platform. It is a platform, not a one-off
analysis feature: every future module this milestone anticipates
(Financial Intelligence, Investor Intelligence, Reports, Dashboard) is
expected to read and write through this same layer rather than rebuilding
its own market logic.

**Status: not wired into the application.** Nothing in `lib/analysis/`,
`lib/research/`, `lib/competitors/`, `lib/store/`, `app/api/`, or
`lib/schemas/` imports from `lib/market/` — those six paths are frozen
this milestone and remain completely unchanged. `lib/market/` is
free-standing, and consumes exactly two things from outside itself: (1)
`lib/research`'s public barrel (`runResearch`, and the `Source`/`Evidence`
schemas/types it exports), and (2) `lib/competitors`'s public barrel
(`discoverCompetitors`, and the `RefreshMetadata`/`RefreshReason` schemas
and `computeNextRefresh`/`determineRefreshPriority` functions it exports)
— never a deep import into either module's internals, and never a direct
provider/search call of its own.

**Core principle, as given:** every future module must consume this
platform instead of rebuilding market logic — a market's profile
persists and improves across many discovery runs, exactly like
`lib/competitors`' `CompanyProfile` does for companies.

---

## Why This Exists

Every prior milestone treated "what is this market like" as a question
answered once, inside one analysis, and discarded afterward. That
duplicates work (the same industry gets "sized" fresh in every unrelated
analysis) and can't improve over time. The Market Intelligence Platform
exists to fix that: a durable `MarketProfile` for every industry Atlas AI
has ever researched, kept up to date by a refresh lifecycle, and exposed
through a reusable scoring object any future feature can consume without
re-deriving it.

---

## Knowledge Platform Architecture

Fourteen folders, each with exactly one job — the same "one layer, one
responsibility" convention `lib/competitors/` and `lib/research/` already
follow. Note the six facet folders (`classification/`, `sizing/`,
`segmentation/`, `geography/`, `trends/`, `regulation/`, `risks/`) each
own exactly one piece of `MarketProfile`, rather than one large builder
file trying to own all of it:

```
lib/market/
├── classification/   Classifies a startup idea into an industry
├── sizing/           TAM/SAM/SOM — architecture only, no fake numbers
├── segmentation/      Constructs CustomerSegment records
├── geography/          Constructs GeographicMarket records
├── trends/              Constructs MarketTrend records
├── regulation/           Constructs Regulation records
├── risks/                 Constructs MarketRisk records
├── knowledge/    Builds/merges MarketProfile records; orchestrates discovery
├── refresh/      Decides when/why/how urgently to re-research a market
├── storage/      MarketKnowledgeStore interface + backends
├── scoring/      6-dimension market scorecards
├── schemas/      Every Zod schema — the single source of truth per shape
├── types/        Non-validated contracts (storage interface)
└── utils/        Text normalization, URL dedupe, generic list dedupe
```

### Data flow

```
knowledge.discoverMarket({ startupIdea })
  │
  ├─ lib/research.runResearch({ topic: "market size and industry landscape for: <idea>" })
  │     └─ ResearchResult { sources, evidence, sourceSummary, ... }  ← unmodified, frozen Research Engine
  │
  ├─ lib/competitors.discoverCompetitors({ startupIdea })
  │     └─ CompetitorDiscoveryResult { candidates, ... }             ← unmodified, frozen Competitor Platform
  │           (used only for an honest `competitorCount` signal)
  │
  ├─ classification.classifyIndustry(startupIdea)   [heuristic]
  │
  └─ knowledge.buildMarketProfile({ industry, sources, evidence, confidence })
        │
        └─ storage.MarketKnowledgeStore.upsert(profile)   ← caller's responsibility

Later, on demand:
  scoring.scoreMarket(profile)               → MarketScore
  refresh.collectStaleMarkets(profiles, now) → priority-ordered re-research queue
  knowledge.mergeMarketProfile(existing, newData) → accumulated MarketProfile
```

Nothing here is wired into a route or a Server Component yet — see
"Future Roadmap" below.

---

## Market Profile (Knowledge Model)

`schemas/market.schema.ts`'s `MarketProfile` is the one record this
platform exists to accumulate — every field the milestone specifies:

| Field | Notes |
|---|---|
| `industry`, `subIndustry` | From `classification.classifyIndustry()`, both real, both honestly `"unclassified"`/absent when nothing matches |
| `sizing` (TAM/SAM/SOM, `schemas/sizing.schema.ts`) | Always present as an object; each estimate's `valueUsd` is absent until real data exists — see Sizing below |
| `customerSegments` (`schemas/segmentation.schema.ts`) | Structured, not free-text — name, description, size, pain points |
| `geographicMarkets` (`schemas/geography.schema.ts`) | Region/country/size/notes |
| `growthRate` (`schemas/sizing.schema.ts`'s `MarketGrowthRateSchema`) | CAGR + period + methodology, optional as a whole |
| `marketMaturity` | One of `emerging`/`growth`/`mature`/`declining` — optional, not defaulted, when unknown |
| `regulations` (`schemas/regulation.schema.ts`) | Name/jurisdiction/description/severity |
| `risks` (`schemas/risks.schema.ts`) | Name/description/severity — market-level, distinct from `lib/competitors`' company-level `threats` |
| `trends` (`schemas/trends.schema.ts`) | Name/description/direction (`rising`/`stable`/`declining`) |
| `sources`, `evidence` | **Reused from `lib/research`'s own `Source`/`Evidence` schemas** — never redefined here |
| `confidence` | 0-100, drives `refresh.refreshPriority` |
| `refresh` | `lastUpdated`/`nextRefresh`/`refreshReason`/`refreshPriority` — **reused from `lib/competitors`'s own `RefreshMetadataSchema`**, not redefined a second time |

A brand-new profile (`knowledge/marketProfileBuilder.ts`'s
`buildMarketProfile`) starts with every list field empty, `sizing` set to
the honest "not yet computed" placeholder from `sizing/marketSizing.ts`,
and `confidence` exactly as low as its first discovery run supports —
never backfilled with a guess.

---

## Discovery Engine

`knowledge/marketDiscovery.ts`'s `discoverMarket(request)` is the sole
entry point, and per this milestone's explicit rule ("Market discovery
must consume: Research Engine, Competitor Platform. Only. Never call
providers directly."):

1. Calls `runResearch()` (from `"@/lib/research"`'s public barrel) with a
   market-framed query (`"market size and industry landscape for:
   <idea>"` — deliberately different from `lib/competitors`' own
   competitor-framed query).
2. Calls `discoverCompetitors()` (from `"@/lib/competitors"`'s public
   barrel) with the same idea, using only its `candidates.length` as an
   honest `competitorCount` signal — never re-deriving competitor logic.
3. Classifies the idea's industry via `classification.classifyIndustry()`
   (a local heuristic — see Entity/Industry Classification below).
4. Computes an honest confidence: the average of the Research Engine's
   own `sourceSummary.averageConfidence` (real signal, `null`-safe) and
   the classification's own confidence — never a flat/guessed number.
5. Builds a `MarketProfile` via `knowledge.buildMarketProfile()`.

This file never imports a provider, `ProviderManager`, or anything under
`lib/research/providers/`/`lib/competitors/discovery/` directly. Turning
a discovered profile into a persisted, refreshable record is the caller's
job via `storage.MarketKnowledgeStore` — discovery itself never touches
storage.

---

## Industry Classification

`classification/industryClassifier.ts`'s `classifyIndustry()` —
deterministic keyword-overlap heuristic, documented, **not ML** (the same
honesty standard `lib/competitors`' `matcher/entityMatcher.ts` and
`discovery/candidateExtraction.ts` hold themselves to). A fixed
`INDUSTRY_KEYWORDS` map across ten common startup categories (fintech,
healthtech, edtech, saas, ecommerce, logistics, proptech, cleantech,
hrtech, martech); `confidence` is honestly proportional to how many
distinct keywords matched (capped at 100), and an idea matching nothing
returns `"unclassified"` at `confidence: 0` — never a fabricated
category or a guessed non-zero confidence. Verified live: a mobile
banking idea correctly classifies as `fintech`; nonsense input correctly
returns `unclassified` at `0`.

---

## Sizing

**Architecture only. No fake calculations.** `sizing/marketSizing.ts`'s
`estimateTAM`/`estimateSAM`/`estimateSOM` each return a
`MarketSizeEstimate` with `valueUsd` deliberately absent and a
`methodology` string documenting *how* a real estimate would be derived
(top-down industry report for TAM, segment/geography-narrowed for SAM,
capture-rate model for SOM) — there is no real market-sizing data
pipeline yet (no financial-data provider, no industry-report ingestion),
so computing an actual number would mean inventing one. This is the same
discipline `lib/competitors`' and `lib/research`'s placeholder layers
apply to their own unimplemented pieces. `buildMarketSizing()` composes
all three into the `MarketSizing` object every `MarketProfile` carries.
Verified live: every estimate's `valueUsd` is honestly absent, and each
carries a real methodology note.

---

## Segmentation / Geography / Trends / Regulation / Risks

Five small, single-purpose builder modules — `segmentation/`,
`geography/`, `trends/`, `regulation/`, `risks/` — each exposing exactly
one `build*()` function that validates and constructs its corresponding
schema shape (`CustomerSegment`, `GeographicMarket`, `MarketTrend`,
`Regulation`, `MarketRisk`). Construction only: no automatic
extraction pipeline exists yet for any of these (see Future Roadmap) — a
real caller (a future research-aware pipeline stage) supplies real,
evidenced field values. `trends/marketTrend.ts`'s `direction` is required
on the input rather than defaulted, so a trend can never be recorded with
a guessed direction.

---

## Refresh Engine

Every `MarketProfile.refresh` carries the same four fields
`lib/competitors`' `CompanyProfile.refresh` does — and reuses its exact
policy rather than redefining it: `refresh/marketRefreshPolicy.ts` imports
`computeNextRefresh`/`determineRefreshPriority` directly from
`"@/lib/competitors"` (both are generic — neither takes a
`CompanyProfile`, only a confidence number or a priority), so both
knowledge platforms share one interval-days table (`urgent` = 1 day,
`high` = 7, `normal` = 30, `low` = 90) instead of two copies that could
drift apart. Only `isMarketStale` needed its own thin, unavoidable local
copy, since `lib/competitors`' exported `isStale` is typed specifically to
`CompanyProfile`.

`refresh/marketRefreshEngine.ts` mirrors `lib/competitors`'
`refreshEngine.ts` exactly: `requestManualRefresh`/
`requestScheduledRefresh`/`requestStaleRefresh` (pure functions — they
never write to a store) and `collectStaleMarkets()` (a priority-ordered
re-research queue).

---

## Storage

`types/storage.ts`'s `MarketKnowledgeStore` interface (`getById`,
`findByIndustry`, `list`, `upsert`, `delete`) mirrors `lib/competitors`'
`CompetitorKnowledgeStore` pattern exactly.

- **`storage/memoryStore.ts`** — `MemoryMarketStore`, a genuinely working
  in-process `Map`-backed store. The only real backend this milestone
  ships.
- **`storage/supabaseStore.ts`** — architecture only; every method throws
  a descriptive "not implemented yet" error. Would use the existing,
  unmodified `lib/supabase.ts` client.
- **`storage/postgresStore.ts`** — architecture only; for a future
  deployment running its own Postgres directly (e.g. a dedicated read
  replica for heavy cross-market analytical queries).
- **`storage/warehouseStore.ts`** — architecture only, future analytical
  warehouse (BigQuery/Snowflake/ClickHouse — undecided). Adds one
  warehouse-specific method (`aggregateByIndustry`) beyond the base
  interface, for a future Reports/Dashboard module to run aggregate
  queries across every known market.
- **`storage/createStore.ts`** — the single factory every caller depends
  on; switching the default backend later is a one-line change here.

---

## Scoring Architecture

**Architecture only. No invented scores.** `scoring/scoringDimensions.ts`
defines the six required dimensions (Growth, Competition, Accessibility,
Regulatory Complexity, Market Opportunity, Maturity), each currently a
function that returns a fixed neutral `50`, exactly like
`lib/competitors`' `scoring/scoringDimensions.ts` and `lib/research`'s
`ranking/factors.ts` — honest rather than fake, because a freshly
discovered `MarketProfile` has no real signal yet for any of these six
dimensions to compute from. `scoring/scoringEngine.ts`'s `scoreMarket()`
is real composition logic layered on top (equal-weighted, 1/6 each,
summing to a 0-100 `overallScore`). Once a placeholder dimension gets a
real implementation, this function needs no changes.

---

## Schemas

Every shape in this platform is Zod-validated, one schema per shape, no
hand-duplicated types — `schemas/`:

- `enums.ts` — `MarketMaturity`, `MarketScoringDimension`, `Severity`,
  `TrendDirection`.
- `sizing.schema.ts` — `MarketSizeEstimate`, `MarketSizing`,
  `MarketGrowthRate`.
- `segmentation.schema.ts`, `geography.schema.ts`, `trends.schema.ts`,
  `regulation.schema.ts`, `risks.schema.ts` — one facet each.
- `classification.schema.ts` — `MarketClassification`.
- `market.schema.ts` — `MarketProfile`, reusing `lib/research`'s
  `Source`/`Evidence` and `lib/competitors`'s `RefreshMetadata` rather
  than redefining them.
- `discovery.schema.ts` — `MarketDiscoveryRequest`/`Result`.
- `scoring.schema.ts` — `MarketDimensionScore`, `MarketScore`.

## Types

`types/storage.ts` — the `MarketKnowledgeStore` contract, kept separate
from `schemas/` per this project's types-vs-schemas convention (it never
crosses a validated boundary itself).

## Documentation

This file (`MARKET_PLATFORM.md`).

---

## Runtime Verification

Exercised live via a temporary scratch route
(`app/market-platform-sanity-check/page.tsx`) against the running dev
server, then deleted — the same technique used for every prior milestone.
**17/17 checks passed**:

- `classifyIndustry` correctly identifies a fintech idea, and honestly
  returns `unclassified`/`0` confidence for nonsense input.
- `buildMarketSizing`/`estimateTAM` return methodology notes with
  `valueUsd` honestly absent — no fabricated numbers.
- All five structured builders (`buildCustomerSegment`,
  `buildGeographicMarket`, `buildMarketTrend`, `buildRegulation`,
  `buildMarketRisk`) produce schema-valid objects.
- `buildMarketProfile` produces a valid profile with correct
  `initial_discovery` refresh metadata.
- `isMarketStale`/`collectStaleMarkets` correctly identify and queue an
  overdue profile.
- `requestManualRefresh`/`requestScheduledRefresh` set the correct reason
  and priority.
- `mergeMarketProfile` unions a structured list (customer segments)
  without duplicating a shared entry across two successive merges.
- `discoverMarket` calls only `runResearch()` and `discoverCompetitors()`
  and returns a schema-valid result with an honest (in this environment,
  zero) confidence and competitor count.
- `scoreMarket` produces all 6 required dimensions at the documented
  neutral placeholder, composing to an overall score of 50.
- `createStore()` defaults to `MemoryMarketStore`; it round-trips a
  profile by id and by case-insensitive industry name.
- `SupabaseMarketStore` honestly throws rather than silently no-op-ing.

**Not verified:** a real multi-run accumulation scenario against a
persisted (non-memory) store, since no durable backend is implemented
yet; and industry classification/discovery against real provider
responses, since no search-provider credentials exist in this environment
(see `PROVIDER_MANAGER.md`'s equivalent caveat).

---

## Future Roadmap

- **Wire into the application.** Nothing calls `lib/market/` yet — a
  future milestone decides how discovery/storage plug into a market-facing
  route and the Analysis Pipeline.
- **Real scoring dimensions.** Replace each
  `scoring/scoringDimensions.ts` placeholder with a real signal source, per
  the roadmap already documented inline there.
- **Real storage backends.** Implement `SupabaseMarketStore` first
  (reuses the existing `lib/supabase.ts` client), then evaluate Postgres-
  direct or the analytical warehouse once real usage patterns exist.
- **Financial Intelligence module** reuses `MarketProfile.sizing`/
  `growthRate` directly instead of re-deriving market size elsewhere.
- **Investor Intelligence module** reuses `MarketScore` and
  `MarketProfile.risks`/`regulations` for investor-facing risk framing.
- **Reports / Dashboard** consume `MarketKnowledgeStore.list()` and a
  future `AnalyticalWarehouseMarketStore.aggregateByIndustry()` for
  cross-market rollups, rather than querying `lib/analysis/` results
  directly.
- **Real segment/trend/regulation/risk extraction.** Today's builders are
  construction-only; a future research-aware pipeline stage would call
  them with real, evidence-backed data extracted from `ResearchResult`.
- **Smarter industry classification.** `classification/
  industryClassifier.ts`'s keyword heuristic is a real starting point, not
  a ceiling — an LLM-based classifier could replace it without changing
  `discoverMarket`'s contract.
