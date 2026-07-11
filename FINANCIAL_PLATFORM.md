# Atlas AI — Financial Intelligence Platform

Milestone 8: Financial Intelligence Platform. This document describes
`lib/financial/` — Atlas AI's permanent, accumulating knowledge base for
a startup's financial picture (revenue model, pricing, cost structure,
unit economics, forecasts, valuation architecture, financial risk),
sitting alongside `lib/competitors/` (Milestone 6) and `lib/market/`
(Milestone 7) as the third reusable knowledge platform. It is a platform,
not a calculator and not a reporting feature: every future module this
milestone anticipates (Business Model Intelligence, Investor
Intelligence, Reports, Dashboard, API) is expected to read and write
through this same layer rather than implementing financial logic
independently.

**Status: not wired into the application.** Nothing in `lib/analysis/`,
`lib/research/`, `lib/competitors/`, `lib/market/`, `lib/store/`,
`app/api/`, or `lib/schemas/` imports from `lib/financial/` — those seven
paths are frozen this milestone and remain completely unchanged.
`lib/financial/` is free-standing, and consumes exactly three things from
outside itself: (1) `lib/research`'s public barrel (`runResearch`, and
the `Source`/`Evidence` schemas/types it exports), (2) `lib/competitors`'s
public barrel (`discoverCompetitors`, `RefreshMetadata` schema,
`computeNextRefresh`/`determineRefreshPriority`), and (3) `lib/market`'s
public barrel (`discoverMarket`, `Severity` schema) — never a deep import
into any of the three modules' internals, and never a direct
provider/search call of its own.

**Core principle, as given:** every future module must consume this
platform instead of implementing financial logic independently — a
financial profile persists and improves across many discovery runs,
exactly like `CompanyProfile` and `MarketProfile` do for their domains.

---

## Why This Exists

Every prior milestone treated "what does this startup's financial
picture look like" as a question answered once, inside one analysis, and
discarded afterward. The Financial Intelligence Platform exists to fix
that: a durable `FinancialProfile`, kept up to date by a refresh
lifecycle, exposed through a reusable scoring object, with every numeric
metric honestly representing what is and isn't actually known — because
a financial number is exactly the kind of output most likely to be
mistaken for real due diligence if fabricated.

---

## Architecture

Fifteen folders, each with exactly one job — the same "one layer, one
responsibility" convention the two prior knowledge platforms follow:

```
lib/financial/
├── economics/     Unit / Customer / Growth / Operating Economics — honest placeholders
├── metrics/       Derived metrics (LTV:CAC) — real composition over economics/'s inputs
├── pricing/       Constructs FinancialPricingStrategy records
├── revenue/       Constructs RevenueStream records
├── costs/         Constructs Expense / CostStructure records
├── forecast/      Base/Best/Worst case forecast models — architecture only
├── valuation/     Revenue Multiple / EBITDA Multiple / DCF / Venture Method — no implementation yet
├── risk/          Constructs FinancialRisk records (6 categories)
├── knowledge/     Builds/merges FinancialProfile records; orchestrates discovery
├── refresh/       Decides when/why/how urgently to re-research a financial profile
├── storage/       FinancialKnowledgeStore interface + backends
├── scoring/       6-dimension financial scorecards
├── schemas/       Every Zod schema — the single source of truth per shape
├── types/         Non-validated contracts (storage interface, economics context)
└── utils/         Text normalization, URL dedupe, generic list dedupe
```

### Data flow

```
knowledge.discoverFinancials({ startupIdea })
  │
  ├─ lib/research.runResearch({ topic: "pricing, unit economics, and funding history for: <idea>" })
  │     └─ ResearchResult { sources, evidence, sourceSummary, ... }  ← unmodified, frozen Research Engine
  │
  ├─ lib/competitors.discoverCompetitors({ startupIdea })
  │     └─ CompetitorDiscoveryResult { candidates, ... }             ← unmodified, frozen Competitor Platform
  │           (used only for an honest `competitorCount` signal)
  │
  ├─ lib/market.discoverMarket({ startupIdea })
  │     └─ MarketDiscoveryResult { profile: { industry, confidence }, ... } ← unmodified, frozen Market Platform
  │           (industry classification reused directly — never re-derived)
  │
  └─ knowledge.buildFinancialProfile({ sources, evidence, economicsContext, confidence })
        │
        ├─ economics/*.estimate*()      → every FinancialEstimate field, honestly unknown
        ├─ metrics.computeLtvToCacRatio() → ltvToCac, composed from cac/ltv
        │
        └─ storage.FinancialKnowledgeStore.upsert(profile)   ← caller's responsibility

Later, on demand:
  scoring.scoreFinancials(profile)                 → FinancialScore
  forecast.buildForecastSet(context)                → { base, best, worst }
  valuation.buildValuationEstimates(context)        → 4 unimplemented method stubs
  refresh.collectStaleFinancials(profiles, now)      → priority-ordered re-research queue
  knowledge.mergeFinancialProfile(existing, newData) → accumulated FinancialProfile
```

Nothing here is wired into a route or a Server Component yet — see
"Future Roadmap" below.

---

## Financial Profile (Knowledge Model)

`schemas/financial.schema.ts`'s `FinancialProfile` is the one record this
platform exists to accumulate — every field the milestone specifies:

| Field | Notes |
|---|---|
| `revenueModel` | One of `subscription`/`transactional`/`usage_based`/`marketplace`/`advertising`/`licensing`/`hybrid`, optional |
| `pricingStrategy` (`schemas/pricing.schema.ts`) | The startup's own strategy — distinct from `lib/competitors`' `Pricing`, which describes a competitor's published price list |
| `costStructure` (`schemas/costs.schema.ts`) | Fixed/variable costs per month |
| `grossMargin`, `operatingMargin`, `burnRate`, `runway`, `breakEven`, `cac`, `ltv`, `ltvToCac`, `mrr`, `arr`, `paybackPeriod` | Every one a `FinancialEstimate` (see below) — honestly unknown until real data exists |
| `revenueStreams` (`schemas/revenue.schema.ts`) | Named streams, plain optional monthly figure per item |
| `expenses` (`schemas/costs.schema.ts`) | Named expenses, categorized (payroll/infrastructure/marketing/sales/operations/other) |
| `fundingStage` | One of `pre_seed`→`public`, optional, never defaulted |
| `financialRisks` (`schemas/risk.schema.ts`) | 6 categories — see Risk Architecture below |
| `financialAssumptions` | Plain string list — the explicit assumptions behind whatever *is* known |
| `sources`, `evidence` | **Reused from `lib/research`'s own `Source`/`Evidence` schemas** — never redefined here |
| `confidence` | 0-100, drives `refresh.refreshPriority` |
| `refresh` | **Reused from `lib/competitors`'s own `RefreshMetadataSchema`** — not redefined a third time |

### The `FinancialEstimate` shape

`schemas/estimate.schema.ts`'s `FinancialEstimate` is the one honest-value
wrapper every numeric metric on `FinancialProfile` uses — generalizing
`lib/market`'s `MarketSizeEstimate` beyond market sizing to any financial
metric:

```ts
{ value?: number; unit?: "usd" | "usd_per_month" | "percent" | "months" | "ratio"; methodology?: string; confidence?: number }
```

`value` is optional so "we don't know this yet" is representable without
a fabricated sentinel like `0`. One schema, reused across all eleven
numeric fields, instead of eleven near-identical shapes.

A brand-new profile (`knowledge/financialProfileBuilder.ts`'s
`buildFinancialProfile`) populates every `FinancialEstimate` field by
calling `economics/`'s estimators — never left undefined — so the
profile always carries a documented methodology note per metric, even
when the value itself is absent.

---

## Discovery Flow

`knowledge/financialDiscovery.ts`'s `discoverFinancials(request)` is the
sole entry point, and per this milestone's explicit rule ("Financial
discovery must consume ONLY: Research Platform, Competitor Platform,
Market Platform. Never call providers directly. Never duplicate existing
logic."):

1. Calls `runResearch()` (from `"@/lib/research"`'s public barrel) with a
   financial-framed query (`"pricing, unit economics, and funding history
   for: <idea>"`).
2. Calls `discoverCompetitors()` (from `"@/lib/competitors"`'s public
   barrel), using only its `candidates.length` as an honest
   `competitorCount` signal.
3. Calls `discoverMarket()` (from `"@/lib/market"`'s public barrel), and
   **reuses its `profile.industry` directly** as this profile's economics
   context — this platform never re-classifies the industry itself, per
   "never duplicate existing logic."
4. Computes an honest confidence: the average of the Research Engine's
   own `sourceSummary.averageConfidence` and the Market Platform's own
   discovery confidence — never a flat/guessed number.
5. Records two real, evidence-backed assumptions (the classified
   industry and the competitor count) into `financialAssumptions`, then
   builds a `FinancialProfile` via `knowledge.buildFinancialProfile()`.

This file never imports a provider or anything under
`lib/research/providers/`, `lib/competitors/discovery/`, or
`lib/market/classification/` directly. Turning a discovered profile into
a persisted, refreshable record is the caller's job via
`storage.FinancialKnowledgeStore` — discovery itself never touches
storage.

---

## Economics Architecture

**Architecture only. Never fabricate numbers.** Four files under
`economics/`, one per category this milestone names:

- **`unitEconomics.ts`** — `estimateCAC`, `estimateLTV`.
- **`customerEconomics.ts`** — `estimatePaybackPeriod`.
- **`growthEconomics.ts`** — `estimateMRR`, `estimateARR`.
- **`operatingEconomics.ts`** — `estimateGrossMargin`,
  `estimateOperatingMargin`, `estimateBurnRate`, `estimateRunway`,
  `estimateBreakEven`.

Every function returns a `FinancialEstimate` with `value` deliberately
absent and a `methodology` string documenting how a real estimate would
be derived (e.g. CAC = total sales+marketing spend ÷ new customers
acquired) — there is no real financial-data pipeline yet (no billing-
system integration, no CRM data), so computing an actual number would
mean inventing one. Exactly the discipline `lib/market`'s `sizing/` and
`lib/competitors`'/`lib/research`'s ranking layers apply to their own
placeholders. Verified live: every estimator's `value` is honestly
absent, and each carries a real, specific methodology note.

`metrics/ltvToCacRatio.ts`'s `computeLtvToCacRatio(ltv, cac)` is the one
piece of *real* composition in this area — the same "real composition
over not-yet-real inputs" pattern `lib/market`'s scoring engine and
`lib/research`'s ranking engine established. It genuinely computes
`ltv.value / cac.value` whenever both are known, and honestly returns an
unknown estimate (with an explanatory methodology) whenever either isn't.
Verified live: returns unknown when both inputs are placeholders;
correctly computes `3` for `ltv=900, cac=300`.

---

## Forecast Architecture

**Architecture only. No fake projections.** `forecast/forecastEngine.ts`'s
`buildForecastModel(scenario, context)` supports all three required
scenarios (`base_case`, `best_case`, `worst_case`); `buildForecastSet()`
builds all three at once. Every scenario's `mrr`/`arr`/`burnRate`/`runway`
is a `FinancialEstimate` with `value` honestly absent and a methodology
note naming the scenario's real future assumption (current-trajectory
extrapolation for base, accelerated growth for best, growth-stall/
runway-pressure for worst) — there is no historical trajectory to
extrapolate from yet. Verified live: all three scenarios return correctly
labeled, value-absent forecasts.

---

## Valuation Architecture

**Prepared, not implemented — per this milestone's explicit rule.**
`valuation/valuationModels.ts` defines the four named methods (Revenue
Multiple, EBITDA Multiple, DCF, Venture Method) as one function each,
every one currently returning a `FinancialEstimate` with `value` absent
and a `"no implementation yet"` methodology note — mirrors
`lib/research/providers/notImplementedResult.ts`'s status-based honesty
pattern (Milestone 4), generalized here to the `FinancialEstimate`
shape rather than a separate status enum, since a value-absent estimate
already says the same thing without introducing a second honesty
mechanism. `buildValuationEstimates()` returns all four at once. Verified
live: 4 methods returned, all with `value: undefined`.

---

## Risk Architecture

`risk/financialRisk.ts`'s `buildFinancialRisk()` supports all six required
categories (`liquidity`, `competition`, `execution`, `funding`, `market`,
`regulatory`) via a `category` field — one construction function, not six,
since the category is data, not a different shape. `severity` reuses
`lib/market`'s own `Severity` schema (imported from `"@/lib/market"`, its
public barrel) rather than redefining the same low/medium/high enum a
third time. Construction only — no automatic risk-detection pipeline
exists yet.

---

## Scoring Architecture

**Architecture only. No invented scores.** `scoring/scoringDimensions.ts`
defines the six required dimensions (Financial Health, Capital
Efficiency, Growth Potential, Revenue Quality, Risk Level, Profitability),
each currently a function that returns a fixed neutral `50`, exactly like
the prior two platforms' scoring layers — honest rather than fake,
because a freshly discovered `FinancialProfile` has no real signal yet
for any of these six dimensions. `scoring/scoringEngine.ts`'s
`scoreFinancials()` is real composition logic layered on top
(equal-weighted, 1/6 each). Verified live: 6 dimensions all at 50,
composing to an overall score of 50.

---

## Refresh Lifecycle

Every `FinancialProfile.refresh` reuses `lib/competitors`'s exact policy
— `refresh/financialRefreshPolicy.ts` imports
`computeNextRefresh`/`determineRefreshPriority` directly from
`"@/lib/competitors"`, so all three knowledge platforms now share one
interval-days table instead of three copies that could drift apart. Only
`isFinancialStale` needed its own thin local copy (the shared `isStale`
is typed specifically to `CompanyProfile`). `refresh/
financialRefreshEngine.ts` mirrors the prior two platforms' refresh
engines exactly: `requestManualRefresh`/`requestScheduledRefresh`/
`requestStaleRefresh` (pure functions) and `collectStaleFinancials()` (a
priority-ordered queue). Verified live: correct staleness detection and
correct manual/scheduled reason-setting.

---

## Storage

`types/storage.ts`'s `FinancialKnowledgeStore` interface (`getById`,
`findByFundingStage`, `list`, `upsert`, `delete`) mirrors the prior two
platforms' store interfaces — `findByFundingStage` is the natural
secondary index here (a `FinancialProfile` has no unique name/industry
key of its own), returning every profile at that stage.

- **`storage/memoryStore.ts`** — `MemoryFinancialStore`, a genuinely
  working in-process `Map`-backed store. The only real backend this
  milestone ships.
- **`storage/supabaseStore.ts`** — architecture only; every method throws
  a descriptive "not implemented yet" error.
- **`storage/postgresStore.ts`** — architecture only; for a future
  dedicated read replica.
- **`storage/warehouseStore.ts`** — architecture only, future analytical
  warehouse. Adds one warehouse-specific method
  (`aggregateByFundingStage`) beyond the base interface.
- **`storage/createStore.ts`** — the single factory every caller depends
  on.

Verified live: `createStore()` defaults to `MemoryFinancialStore` and
round-trips a profile by id and by funding stage; `SupabaseFinancialStore`
honestly throws rather than silently no-op-ing.

---

## Schemas

Every shape in this platform is Zod-validated, one schema per shape, no
hand-duplicated types — `schemas/`:

- `estimate.schema.ts` — `FinancialUnit`, `FinancialEstimate` (the shared
  honesty wrapper).
- `revenue.schema.ts` — `RevenueModel`, `RevenueStream`.
- `costs.schema.ts` — `ExpenseCategory`, `Expense`, `CostStructure`.
- `pricing.schema.ts` — `FinancialPricingStrategy`.
- `forecast.schema.ts` — `ForecastScenario`, `ForecastModel`.
- `valuation.schema.ts` — `ValuationMethod`, `ValuationEstimate`.
- `risk.schema.ts` — `FinancialRiskCategory`, `FinancialRisk`.
- `scoring.schema.ts` — `FinancialScoringDimension`,
  `FinancialDimensionScore`, `FinancialScore`.
- `fundingStage.schema.ts` — `FundingStage`.
- `financial.schema.ts` — `FinancialProfile`, reusing `lib/research`'s
  `Source`/`Evidence` and `lib/competitors`'s `RefreshMetadata`.
- `discovery.schema.ts` — `FinancialDiscoveryRequest`/`Result`.

## Types

`types/storage.ts` — the `FinancialKnowledgeStore` contract.
`types/economics.ts` — `EconomicsContext`, a non-validated config bag
that only feeds methodology text, never crosses a schema boundary itself
(mirrors `lib/market`'s `MarketSizingContext`).

---

## Runtime Verification

Exercised live via a temporary scratch route
(`app/financial-platform-sanity-check/page.tsx`) against the running dev
server, then deleted — the same technique used for every prior
milestone. **17/17 checks passed**:

- `estimateCAC`/`estimateLTV` honestly omit `value` and document real
  methodology notes.
- `computeLtvToCacRatio` honestly returns unknown when both inputs are
  placeholders, and correctly computes a real ratio (`3`) once both
  inputs are known.
- All structured builders (pricing strategy, revenue stream, expense,
  cost structure, financial risk) produce schema-valid objects.
- `buildForecastSet` returns all three required scenarios, all honestly
  missing projected values.
- `buildValuationEstimates` returns all four required methods, all
  honestly unimplemented.
- `buildFinancialProfile` produces a valid profile with correct
  `initial_discovery` refresh metadata and a correctly-composed
  (honestly unknown) `ltvToCac`.
- `isFinancialStale`/`collectStaleFinancials` correctly identify and queue
  an overdue profile.
- `requestManualRefresh`/`requestScheduledRefresh` set the correct reason
  and priority.
- `mergeFinancialProfile` unions a structured list (expenses) without
  duplicating a shared entry, and never touches any `FinancialEstimate`
  field during a merge.
- `discoverFinancials` calls only `runResearch()`, `discoverCompetitors()`,
  and `discoverMarket()`, correctly reuses the Market Platform's own
  industry classification, and returns a schema-valid result with an
  honest (in this environment, zero) confidence.
- `scoreFinancials` produces all 6 required dimensions at the documented
  neutral placeholder, composing to an overall score of 50.
- `createStore()` defaults to `MemoryFinancialStore`; it round-trips a
  profile by id and by funding stage.
- `SupabaseFinancialStore` honestly throws rather than silently no-op-ing.

**Not verified:** a real multi-run accumulation scenario against a
persisted (non-memory) store, since no durable backend is implemented
yet; and economics/forecast/valuation against real financial data, since
no real financial-data provider or billing integration exists in this
environment.

---

## Future Roadmap

- **Wire into the application.** Nothing calls `lib/financial/` yet — a
  future milestone decides how discovery/storage plug into a
  financial-facing route and the Analysis Pipeline.
- **Real economics.** Replace each `economics/` placeholder with a real
  signal source once a billing/CRM/financial-data integration exists.
- **Real forecast models.** Once `economics/growthEconomics.ts` and
  `operatingEconomics.ts` produce real MRR/burn-rate history,
  `forecast/forecastEngine.ts` can extrapolate real scenario-specific
  trajectories instead of honest placeholders.
- **Real valuation models.** Implement each of the four named methods
  once real ARR/EBITDA/forecast data and comparable multiples exist —
  each method's function signature is already the permanent contract.
- **Real scoring dimensions.** Replace each
  `scoring/scoringDimensions.ts` placeholder with a real composite once
  its underlying inputs are real.
- **Real storage backends.** Implement `SupabaseFinancialStore` first
  (reuses the existing `lib/supabase.ts` client), then evaluate
  Postgres-direct or the analytical warehouse once real usage patterns
  exist.
- **Business Model Intelligence module** reuses `FinancialProfile.
  revenueModel`/`pricingStrategy`/`costStructure` directly instead of
  re-deriving business-model logic elsewhere.
- **Investor Intelligence module** reuses `FinancialScore` and
  `FinancialProfile.financialRisks`/`valuation` estimates for
  investor-facing framing.
- **Reports / Dashboard** consume `FinancialKnowledgeStore.list()` and a
  future `AnalyticalWarehouseFinancialStore.aggregateByFundingStage()`
  for cross-profile rollups.
- **API module** exposes `discoverFinancials`/`scoreFinancials` behind a
  thin route once Milestone 4 (Authentication) exists to scope profiles
  per user/project.
