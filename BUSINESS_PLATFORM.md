# Atlas AI — Business Intelligence Platform

Milestone 9: Business Intelligence Platform. This document describes
`lib/business/` — Atlas AI's permanent, accumulating knowledge base that
**synthesizes** the three prior knowledge platforms (`lib/competitors/`,
`lib/market/`, `lib/financial/`) plus the Research Engine
(`lib/research/`) into one reusable `BusinessProfile`: business model,
strategy, competitive position, execution readiness, and an overall SWOT
and health assessment. It is a platform, not a report generator and not
an AI prompt: every future system this milestone anticipates (Investor
Intelligence, Reports, Dashboard, API, Recommendations) is expected to
read and write through this same layer rather than rebuilding business
analysis logic.

**Status: not wired into the application.** Nothing in `lib/analysis/`,
`lib/research/`, `lib/competitors/`, `lib/market/`, `lib/financial/`,
`lib/store/`, `app/api/`, or `lib/schemas/` imports from `lib/business/`
— those eight paths are frozen this milestone and remain completely
unchanged. `lib/business/` is free-standing, and consumes exactly four
things from outside itself: `lib/research`'s public barrel (`runResearch`,
`Source`/`Evidence`), `lib/competitors`'s public barrel
(`discoverCompetitors`, `RefreshMetadata`, `computeNextRefresh`/
`determineRefreshPriority`), `lib/market`'s public barrel
(`discoverMarket`, `CustomerSegment`, `Severity`), and `lib/financial`'s
public barrel (`discoverFinancials`, `RevenueModel`, `FundingStage`) —
never a deep import into any of the four modules' internals, and never a
direct provider/search call of its own.

**Core principle, as given:** this milestone's responsibility is
**synthesis** — combine knowledge already available, never invent a
business fact, and represent unavailable information honestly.

---

## Why This Exists

Every prior milestone answered one narrow question well:
`lib/competitors/` who else is in this space, `lib/market/` how big and
what shape is the market, `lib/financial/` what does the unit economics
look like. None of them answer "is this, as a *whole business*, a good
idea?" — that requires combining all three (plus real research) into one
coherent picture: business model, go-to-market, competitive moat,
execution complexity, and an honest overall verdict. The Business
Intelligence Platform exists to be that combining layer, built once and
reused by every future consumer, rather than re-synthesized ad hoc inside
a report generator or a prompt.

---

## Architecture

Seventeen folders. Sixteen map directly onto a facet of the
`BusinessProfile` (or a cross-cutting concern); `strategy/` is the one
mid-tier folder that composes four of the others, so
`knowledge/businessProfileBuilder.ts` doesn't have to:

```
lib/business/
├── model/            Business Model, Value Proposition*, Customer Problem*, Customer Segments, Revenue Strategy
├── positioning/       Competitive Position, Competitive Advantages
├── moat/               Economic Moat
├── gtm/                 Go-To-Market Strategy, Distribution Channels
├── growth/               Growth Strategy, Growth Drivers, Expansion Opportunities
├── strategy/    Composes positioning/ + moat/ + gtm/ + growth/ into one shape
├── execution/       Execution Complexity, Key Dependencies
├── risk/               Operational Risks
├── profile/              Business Strengths/Weaknesses/Opportunities/Threats, Overall Business Health
├── recommendations/  Reusable Recommendation objects — architecture only, none generated
├── refresh/          Decides when/why/how urgently to re-research a business profile
├── storage/           BusinessKnowledgeStore interface + backends
├── scoring/             6-dimension business scorecards
├── knowledge/    Builds/merges BusinessProfile records; orchestrates discovery
├── schemas/        Every Zod schema — the single source of truth per shape
├── types/            Non-validated contracts (storage interface, synthesis intermediates)
└── utils/              Text normalization, URL dedupe, generic list dedupe

  (* value proposition / customer problem stay honestly unset this
     milestone — see "What Stays Honestly Unknown" below)
```

### Data flow

```
knowledge.discoverBusiness({ startupIdea })
  │
  ├─ lib/research.runResearch({ topic: "business model, strategy, and competitive positioning for: <idea>" })
  │     └─ ResearchResult { sources, evidence, sourceSummary, ... }        ← unmodified, frozen Research Engine
  │
  ├─ lib/competitors.discoverCompetitors({ startupIdea })
  │     └─ CompetitorDiscoveryResult { candidates, ... }                  ← unmodified, frozen Competitor Platform
  │           (used only for an honest `competitorCount` signal)
  │
  ├─ lib/market.discoverMarket({ startupIdea })
  │     └─ MarketDiscoveryResult { profile: { industry, customerSegments, confidence } }  ← frozen Market Platform
  │           (industry + customer segments reused directly — never re-derived)
  │
  ├─ lib/financial.discoverFinancials({ startupIdea })
  │     └─ FinancialDiscoveryResult { profile: { revenueModel, pricingStrategy, fundingStage, confidence } } ← frozen Financial Platform
  │           (revenue model + funding stage reused directly — never re-derived)
  │
  └─ knowledge.buildBusinessProfile({ customerSegments, revenueModel, sources, evidence, confidence })
        │
        ├─ model.deriveBusinessModelFields()   → businessModel, customerSegments, revenueStrategy
        ├─ strategy.deriveStrategy()           → positioning + moat + gtm + growth, composed
        ├─ execution.deriveExecution()         → executionComplexity, keyDependencies
        ├─ risk.deriveOperationalRisks()       → operationalRisks
        ├─ profile.deriveBusinessSwot()        → SWOT
        ├─ profile.deriveOverallHealth()       → overallHealth
        │
        └─ storage.BusinessKnowledgeStore.upsert(profile)   ← caller's responsibility

Later, on demand:
  scoring.scoreBusiness(profile)                    → BusinessScore
  refresh.collectStaleBusinesses(profiles, now)      → priority-ordered re-research queue
  knowledge.mergeBusinessProfile(existing, newData)  → accumulated BusinessProfile
  recommendations.buildRecommendation(input)         → one validated Recommendation (construction only)
```

Nothing here is wired into a route or a Server Component yet — see
"Future Roadmap" below.

---

## Business Profile (Knowledge Model)

`schemas/business.schema.ts`'s `BusinessProfile` carries every field this
milestone specifies. Fields are flattened directly (plain optional
strings/arrays) wherever the value is simple, and reserved as a small
nested object only for a genuinely multi-part concept — the same
flat-vs-nested judgment `lib/market` and `lib/financial` already made for
their own profiles:

| Field | Shape | Notes |
|---|---|---|
| Business Model | `string?` | Reused from the Financial Platform's own `RevenueModel` enum value |
| Value Proposition | `string?` | Honestly unset this milestone — no upstream platform captures this |
| Customer Problem | `string?` | Honestly unset this milestone |
| Customer Segments | `CustomerSegment[]` | **Reused from `lib/market`'s own schema** — not redefined |
| Go-To-Market Strategy | `string?` | Via `strategy/` → `gtm/` |
| Distribution Channels | `string[]` | Via `strategy/` → `gtm/` |
| Revenue Strategy | `string?` | Via `model/`, from the Financial Platform's pricing rationale |
| Growth Strategy | `string?` | Via `strategy/` → `growth/` |
| Growth Drivers | `string[]` | Via `strategy/` → `growth/` |
| Expansion Opportunities | `string[]` | Via `strategy/` → `growth/` |
| Competitive Position | `CompetitivePosition?` (`leader`/`challenger`/`follower`/`niche`) | Via `strategy/` → `positioning/` |
| Competitive Advantages | `string[]` | Via `strategy/` → `positioning/` |
| Economic Moat | `EconomicMoat` (`{ type?, strengthScore?, rationale? }`) | Via `strategy/` → `moat/` |
| Execution Complexity | `ExecutionComplexityLevel?` (`low`/`medium`/`high`/`very_high`) | Via `execution/` |
| Key Dependencies | `Dependency[]` (`{ name, description?, criticality? }`) | Via `execution/`; `criticality` reuses `lib/market`'s `Severity` |
| Operational Risks | `OperationalRisk[]` (`{ name, description?, severity? }`) | Via `risk/`; `severity` reuses `lib/market`'s `Severity` |
| Business Strengths/Weaknesses/Opportunities/Threats | `string[]` each | Via `profile/businessSwot.ts` |
| Overall Business Health | `BusinessHealth` (`{ rating?, rationale? }`) | Via `profile/businessHealth.ts` |
| Sources, Evidence | Reused from `lib/research` | Never redefined |
| Confidence | `number` (0-100) | Averaged from the Research Engine's + Market's + Financial's own confidences |
| Last Updated, Next Refresh | `RefreshMetadata` | **Reused from `lib/competitors`'s own schema** — not redefined a fourth time |

---

## Business Synthesis

**This milestone's core responsibility.** Every facet folder
(`model/`, `positioning/`, `moat/`, `gtm/`, `growth/`, `execution/`,
`risk/`, `profile/`) exposes exactly one `derive*()` function that either:

1. **Real passthrough** — copies an already-discovered value from an
   upstream platform without altering it (`model/businessModelSynthesis.ts`
   copies the Financial Platform's `RevenueModel` and the Market
   Platform's `CustomerSegment[]` verbatim), or
2. **Honest architecture-only default** — returns empty arrays / absent
   optional fields, documented with a comment explaining exactly what real
   data would be needed and why this milestone can't honestly supply it
   yet (every other facet: `positioning/`, `moat/`, `gtm/`, `growth/`,
   `execution/`, `risk/`, `profile/`'s SWOT).

`strategy/strategySynthesis.ts`'s `deriveStrategy()` is the one
**mid-tier composition** function: it calls `positioning`/`moat`/`gtm`/
`growth`'s own `derive*()` functions and flattens their results into the
single shape `knowledge/businessProfileBuilder.ts` needs — real
composition logic, not a fifth source of data.

### What stays honestly unknown this milestone

- **Value proposition / customer problem** — no upstream platform
  captures either; `buildBusinessProfile` sets both to `undefined`
  explicitly rather than guessing from the idea string.
- **Competitive position, competitive advantages, economic moat** — real
  assessment requires product-differentiation data none of the four
  platforms have. Note specifically: `positioning/positioningSynthesis.ts`
  does **not** infer a position from the Competitor Platform's discovered
  competitor *count* — count alone says nothing about relative strength,
  and inferring one anyway would be exactly the fabrication this
  milestone prohibits.
- **Execution complexity, key dependencies, operational risks** —
  require real operational data.
- **Business SWOT** — requires a real synthesis step (likely AI-assisted,
  a future milestone) this platform doesn't perform.
- **Overall business health rating** — deliberately never derived from
  `confidence` (see `profile/businessHealth.ts`'s own comment):
  *how complete a profile is* and *how healthy the business actually is*
  are different questions, and conflating them would itself be a
  dishonest shortcut. A real rating requires the scoring engine's real
  dimension scores, which are themselves architecture-only placeholders.

Verified live: `discoverBusiness()` against an idea with no configured
search-provider credentials in this environment produces an honestly
mostly-empty profile — `businessModel` populated from the reused
`RevenueModel`, `customerSegments` from the reused Market Platform data,
`confidence: 0`, everything else honestly absent/empty. This is the
correct, honest result, not a bug.

---

## Discovery Flow

`knowledge/businessDiscovery.ts`'s `discoverBusiness(request)` is the sole
entry point, and per this milestone's explicit rule ("Business discovery
must consume ONLY: Research Platform, Competitor Platform, Market
Platform, Financial Platform. Never call providers directly. Never
duplicate logic already implemented elsewhere."):

1. Calls `runResearch()`, `discoverCompetitors()`, `discoverMarket()`, and
   `discoverFinancials()` **concurrently** (`Promise.all`) — four
   platform calls, never a provider.
2. Reuses `discoverMarket().profile.industry` and `.customerSegments`,
   and `discoverFinancials().profile.revenueModel`, `.pricingStrategy`,
   and `.fundingStage` **directly** — this platform never re-classifies
   an industry, never re-derives a revenue model, and never re-assesses a
   funding stage.
3. Computes an honest confidence: the Research Engine's own
   `sourceSummary.averageConfidence`, averaged with the Market and
   Financial Platforms' own discovery confidences.
4. Builds a `BusinessProfile` via `knowledge.buildBusinessProfile()`.

This file never imports a provider or anything under any upstream
platform's internal subfolders.

---

## Scoring Architecture

**Architecture only. No invented scores.** `scoring/scoringDimensions.ts`
defines the six required dimensions (Business Quality, Execution
Readiness, Growth Potential, Competitive Strength, Operational Health,
Strategic Position), each currently a function that returns a fixed
neutral `50`, exactly like the other three platforms' scoring layers.
`scoring/scoringEngine.ts`'s `scoreBusiness()` is real composition logic
layered on top (equal-weighted, 1/6 each). Verified live: 6 dimensions
all at 50, composing to an overall score of 50.

---

## Recommendation Model

**Architecture only — per this milestone's explicit rule ("Do NOT
generate recommendations yet").** `schemas/recommendation.schema.ts`'s
`Recommendation` supports every field the spec requires: `category` (one
of the eight named — Growth, Pricing, Marketing, Operations, Technology,
Funding, Hiring, Product), `priority`, `reason`, `requiredEvidence`, and
`confidence`. `recommendations/recommendationBuilder.ts`'s
`buildRecommendation()` is the one constructor — it validates and shapes
a `Recommendation`, but decides nothing about *what* to recommend. A
future milestone's generation logic (reading a `BusinessProfile`/
`BusinessScore` and deciding what's actually worth recommending) calls
this constructor for each recommendation it produces — the same
separation of "valid shape" from "real content" every builder in this
codebase's knowledge platforms maintains.

---

## Refresh Lifecycle

Every `BusinessProfile.refresh` reuses `lib/competitors`'s exact policy —
`refresh/businessRefreshPolicy.ts` imports
`computeNextRefresh`/`determineRefreshPriority` directly from
`"@/lib/competitors"`, so all four knowledge platforms now share one
interval-days table instead of four copies that could drift apart. Only
`isBusinessStale` needed its own thin local copy. `refresh/
businessRefreshEngine.ts` mirrors the other three platforms' refresh
engines exactly: `requestManualRefresh`/`requestScheduledRefresh`/
`requestStaleRefresh` (pure functions) and `collectStaleBusinesses()` (a
priority-ordered queue). Verified live: correct staleness detection and
correct manual/scheduled reason-setting.

---

## Storage

`types/storage.ts`'s `BusinessKnowledgeStore` interface (`getById`,
`findByHealthRating`, `list`, `upsert`, `delete`) mirrors the other three
platforms' store interfaces.

- **`storage/memoryStore.ts`** — `MemoryBusinessStore`, a genuinely
  working in-process `Map`-backed store.
- **`storage/supabaseStore.ts`** — architecture only; every method throws
  a descriptive "not implemented yet" error.
- **`storage/postgresStore.ts`** — architecture only; for a future
  dedicated read replica.
- **`storage/warehouseStore.ts`** — architecture only, future knowledge
  warehouse. Adds one warehouse-specific method
  (`aggregateByHealthRating`) beyond the base interface.
- **`storage/createStore.ts`** — the single factory every caller depends
  on.

Verified live: `createStore()` defaults to `MemoryBusinessStore` and
round-trips a profile by id; `findByHealthRating` honestly returns `[]`
(no profile has ever been assigned a rating, per the Business Synthesis
discipline above); `SupabaseBusinessStore` honestly throws.

---

## Schemas

Every shape in this platform is Zod-validated, one schema per shape, no
hand-duplicated types — `schemas/`:

- `enums.ts` — `CompetitivePosition`, `MoatType`,
  `ExecutionComplexityLevel`, `BusinessHealthRating`,
  `RecommendationCategory`, `RecommendationPriority`,
  `BusinessScoringDimension`.
- `moat.schema.ts` — `EconomicMoat`.
- `health.schema.ts` — `BusinessHealth`.
- `risk.schema.ts` — `OperationalRisk` (reuses `lib/market`'s `Severity`).
- `execution.schema.ts` — `Dependency` (reuses `lib/market`'s `Severity`).
- `recommendation.schema.ts` — `Recommendation`.
- `scoring.schema.ts` — `BusinessDimensionScore`, `BusinessScore`.
- `business.schema.ts` — `BusinessProfile`, reusing `lib/research`'s
  `Source`/`Evidence`, `lib/competitors`'s `RefreshMetadata`, and
  `lib/market`'s `CustomerSegment`.
- `discovery.schema.ts` — `BusinessDiscoveryRequest`/`Result`, reusing
  `lib/financial`'s `FundingStage`.

## Types

`types/storage.ts` — the `BusinessKnowledgeStore` contract.
`types/synthesis.ts` — plain, non-schema intermediate shapes
(`BusinessModelFields`, `PositioningFields`, `GoToMarketFields`,
`GrowthFields`, `StrategyFields`, `ExecutionFields`, `BusinessSwot`) each
facet's `derive*()` function returns — none of these crosses a validation
boundary itself; only their constituent fields do, once flattened into a
`BusinessProfileSchema`-valid object.

---

## Runtime Verification

Exercised live via a temporary scratch route
(`app/business-platform-sanity-check/page.tsx`) against the running dev
server, then deleted. **17/17 checks passed**:

- Every leaf synthesis facet (`positioning`/`moat`/`gtm`/`growth`)
  returns its documented honest-empty default.
- `deriveStrategy` correctly composes all four leaf facets into one
  shape.
- Structured builders (`dependency`, `operationalRisk`,
  `recommendation`) produce schema-valid objects.
- `deriveBusinessSwot` returns an all-empty SWOT; `deriveOverallHealth`
  honestly omits `rating` while explaining why.
- `buildBusinessProfile` produces a valid profile with correct
  `initial_discovery` refresh metadata, and correctly reuses a supplied
  `revenueModel` as `businessModel`.
- `isBusinessStale`/`collectStaleBusinesses` correctly identify and queue
  an overdue profile.
- `requestManualRefresh`/`requestScheduledRefresh` set the correct reason
  and priority.
- `mergeBusinessProfile` unions structured lists (dependencies) and plain
  string lists (strengths) without duplicating a shared entry.
- `discoverBusiness` calls only the four permitted platforms and returns
  a schema-valid result correctly reusing the Market/Financial Platforms'
  own signals.
- `scoreBusiness` produces all 6 required dimensions at the documented
  neutral placeholder, composing to an overall score of 50.
- `createStore()` defaults to `MemoryBusinessStore` and round-trips a
  profile by id; `findByHealthRating` honestly returns `[]`;
  `SupabaseBusinessStore` honestly throws.

**Not verified:** a real multi-run accumulation scenario against a
persisted (non-memory) store; and business synthesis against real,
richly-populated upstream platform data, since no real
search-provider/financial-data credentials exist in this environment.

---

## Future Roadmap

- **Wire into the application.** Nothing calls `lib/business/` yet.
- **Real synthesis for positioning/moat/gtm/growth/execution/risk/SWOT.**
  Each facet's `derive*()` function is a real, permanent contract; a
  future implementation (likely AI-assisted, reading real upstream
  platform data) replaces only the body.
- **Real scoring dimensions**, once their underlying inputs are real.
- **Recommendation generation.** A future milestone reads a
  `BusinessProfile`/`BusinessScore` and calls
  `recommendations.buildRecommendation()` for each real recommendation it
  decides to surface.
- **Real storage backends**, `SupabaseBusinessStore` first.
- **Investor Intelligence module** reuses `BusinessScore` and
  `BusinessProfile.economicMoat`/`operationalRisks` for investor-facing
  framing.
- **Reports / Dashboard** consume `BusinessKnowledgeStore.list()` and a
  future `KnowledgeWarehouseBusinessStore.aggregateByHealthRating()`.
- **API module** exposes `discoverBusiness`/`scoreBusiness` behind a thin
  route once Milestone 4 (Authentication) exists.
