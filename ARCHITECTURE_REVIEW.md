# Atlas AI — Architecture Review

A full engineering audit of the five knowledge platforms built so far
(`lib/research/`, `lib/competitors/`, `lib/market/`, `lib/financial/`,
`lib/business/`), performed before starting Milestone 10 (Investor
Intelligence). This is a review, not a refactor — every finding below was
independently verified against the actual source (grep/read, not
recollection), and no production code was changed to produce it.

**Overall Architecture Score: 8.6 / 10** — a genuinely disciplined,
consistent, layered system. The one real structural gap is documentation
(the root `ARCHITECTURE.md` is stale); everything else is either a small,
predictable amount of mechanical duplication or a deliberate, sound
design choice that only looks like inconsistency at first glance.

---

## Check 1 — Architecture Boundaries

**Verified via direct grep across every `.ts` file in all five platforms
(not sampled).**

- **Deep imports: none found.** Every cross-platform import goes through
  a public barrel (`"@/lib/research"`, `"@/lib/competitors"`,
  `"@/lib/market"`, `"@/lib/financial"`) — zero instances of a deep path
  like `"@/lib/research/schemas/..."` from outside `lib/research/` itself.
- **Circular dependencies: none.** The dependency graph is a strict DAG:
  `research ← competitors ← market ← financial ← business`. Verified in
  both directions — no downstream platform is ever imported by an
  upstream one (research never imports competitors/market/financial/
  business; competitors never imports market/financial/business; market
  never imports financial/business; financial never imports business).
  Also verified within `lib/business/` itself: no facet folder
  (`model/`, `positioning/`, `moat/`, `gtm/`, `growth/`, `execution/`,
  `risk/`, `profile/`) imports from `knowledge/` (the reverse of the
  intended direction), and `strategy/` (which depends on `positioning/`,
  `moat/`, `gtm/`, `growth/`) is never imported back by any of them.
- **Duplicated business logic: none of the load-bearing kind.** The
  refresh policy (`computeNextRefresh`/`determineRefreshPriority`) is
  defined exactly once, in `lib/competitors`, and genuinely reused (not
  copied) by `lib/market`, `lib/financial`, and `lib/business` via direct
  import from the public barrel. `Severity` is defined once in
  `lib/market` and reused by `lib/financial` and `lib/business`.
  `RefreshMetadata`/`RefreshReason`/`RefreshPriority` are defined once in
  `lib/competitors` and reused by all three later platforms. This is the
  one thing most likely to have silently drifted across five milestones,
  and it didn't.
  There **is** duplicated *mechanical* logic — see Technical Debt #1.
- **Responsibility leakage: none.** Zero `"use client"`, zero `next/`
  imports, zero `react` imports anywhere across all five platforms —
  confirmed they remain exactly what every one of their own docs claims:
  framework-agnostic, unwired, server-side-only knowledge layers. Also
  confirmed (grep across `app/`, `lib/services/`, `lib/analysis/`,
  `lib/store/`) that nothing outside the five platforms imports from any
  of them yet — every platform's "not wired into the application" claim
  in its own `.md` is accurate, not aspirational.

**Verdict: clean.** This is the strongest section of the review — five
milestones built independently, by the same instructions pattern, and
the boundary discipline held throughout.

---

## Check 2 — Public API Review

Export counts per barrel (top-level named exports, excluding the
`schemas`/`types` wildcard re-exports): `lib/research` 12,
`lib/competitors` 13, `lib/market` 17, `lib/financial` 22,
`lib/business` 21. Growth is roughly proportional to each platform's
actual feature surface, not runaway.

- **Minimal:** internal implementation details correctly stay private in
  every case checked — id counters (`nextCompanyId`, `nextMarketId`,
  `nextFinancialId`, `nextBusinessId`, `nextRecommendationId`), the
  per-platform `utils/` helpers, and every facet-internal composition
  function not meant for outside use are never re-exported from a
  top-level barrel.
- **Consistent:** every barrel follows the same shape — named exports for
  the profile builder, merger, discovery function, every facet's public
  builder/derive function, the scoring engine, the four refresh-engine
  functions, `createStore` + `MemoryXStore`, then a wildcard `schemas`/
  `types` re-export at the end. A reader who's seen one barrel can predict
  the next one's structure.
- **Nothing found that should become private.** Every exported symbol is
  either called by a sibling platform today (`discoverMarket`,
  `discoverFinancials`, `discoverCompetitors`, `computeNextRefresh`,
  `determineRefreshPriority`, `Severity`, `RevenueModel`,
  `CustomerSegment`, `FundingStage`) or is explicitly named as the
  intended integration point for a future consumer in that platform's own
  `.md` (e.g. `scoreBusiness`, `buildRecommendation`).

**Verdict: clean.**

---

## Check 3 — Knowledge Flow

Intended flow: **Idea → Research → Competitors → Market → Financial →
Business**, no layer bypassing another.

Verified concretely: `discoverCompetitors()` consumes only `runResearch()`.
`discoverMarket()` consumes `runResearch()` **and** `discoverCompetitors()`.
`discoverFinancials()` consumes `runResearch()`, `discoverCompetitors()`,
**and** `discoverMarket()`. `discoverBusiness()` consumes all four
(`runResearch`, `discoverCompetitors`, `discoverMarket`,
`discoverFinancials`) concurrently via `Promise.all`.

This is **cumulative, not strictly sequential-only** — each layer calls
every layer beneath it, not merely the one immediately before it. That is
correct, not a bypass: "no layer should bypass another" means Business
must not skip Market and call Research directly *without also* going
through Market — and it doesn't; it calls both, plus everything else
beneath it. Concretely: every one of Business's four upstream calls
routes through that platform's own `discover*()` entry point, never a
provider, never an internal function.

Also verified: real data actually flows forward, not just the calls —
`discoverMarket()` reuses its own industry classification rather than
re-deriving it in Financial or Business; `discoverFinancials()`'s
`revenueModel`/`pricingStrategy`/`fundingStage` are reused verbatim by
`discoverBusiness()` rather than re-classified; `discoverBusiness()`
reuses Market's `customerSegments` directly.

**Verdict: clean, and more rigorous than the minimum bar** ("don't
bypass") — every layer actively reuses its upstream layers' real output,
not just their side effect of having run.

---

## Check 4 — Schema Review

- **Naming consistency:** every profile schema follows the same
  skeleton — `id`, domain fields, `sources: Source[]`,
  `evidence: Evidence[]`, `confidence: number (0-100)`,
  `refresh: RefreshMetadata`. Verified `confidence` is
  `z.number().min(0).max(100)` in **every** schema across all five
  platforms with zero exceptions — required at the profile level,
  `.optional()` at the sub-estimate level (`MarketSizeEstimate`,
  `FinancialEstimate`). No drift.
- **Duplicated schemas: none for shared concepts.** `Severity`,
  `RefreshMetadata`/`RefreshReason`/`RefreshPriority`, `Source`,
  `Evidence`, `CustomerSegment`, `RevenueModel`, `FundingStage` are each
  defined exactly once and confirmed (via grep) never redefined
  elsewhere. This is the schema-layer expression of the same discipline
  Check 1 found at the logic layer.
- **Reusable schemas:** the "honest estimate" pattern
  (`MarketSizeEstimate` → generalized into `FinancialEstimate`) is a
  genuine, deliberate reuse-of-idea across platforms, even where the
  concrete schema differs because the domain differs. This is the right
  call — a shared *pattern*, not a forced shared *type*, since Market's
  and Financial's estimates carry different unit vocabularies.
- **Evidence propagation:** traced end to end. `runResearch()` produces
  `Source[]`/`Evidence[]` → every synthesis discovery function
  (`discoverMarket`, `discoverFinancials`, `discoverBusiness`) passes
  `researchResult.sources`/`.evidence` straight into its own profile
  builder, unmodified → every profile merger dedupes them by URL on
  accumulation, never drops them. No dead end found anywhere in the
  chain.
- **Confidence propagation:** consistent pattern across all three
  synthesis platforms — each computes its own confidence as an average of
  the Research Engine's own `sourceSummary.averageConfidence` and its
  upstream platform(s)' own discovery confidence, never a flat or
  invented number. (The three `computeDiscoveryConfidence` functions
  implementing this are themselves separately written per platform — see
  Technical Debt #1; the *policy* is consistent even though the *code*
  computing it isn't shared.)

**Verdict: clean**, with one related code-duplication note carried to
Technical Debt.

---

## Check 5 — Storage Review

Every `getById`/`list`/`upsert`/`delete` signature is identical in shape
across all four knowledge stores (Competitor/Market/Financial/Business).
The one secondary-index method differs by name and return cardinality —
`findByName`/`findByIndustry` return `T | null`, `findByFundingStage`/
`findByHealthRating` return `T[]`. **This is correct, not an
inconsistency**: a company name and an industry are (for this platform's
purposes) effectively unique keys, while a funding stage or a health
rating are shared categorical attributes many profiles hold at once —
returning a single nullable match for the former and an array for the
latter is the honest reflection of what each key actually means.

The fourth backend also differs by name — `vector` for Competitors vs.
`warehouse` for Market/Financial/Business. This is not drift either: the
Competitor Platform's own Milestone 6 spec explicitly asked for "a future
vector DB," while Market/Financial/Business's specs explicitly asked for
"a future analytical warehouse" — each platform correctly implemented
its own instructions.

Every architecture-only backend (`Supabase*Store`, `Postgres*Store`,
`*WarehouseStore`) throws a descriptive, consistent
`"<ClassName> is architecture only — ..."` error rather than silently
no-op'ing — verified across all four platforms' storage folders. No
backend ever fakes a successful write.

**Minor observation (not a defect):** there's no shared generic
`KnowledgeStore<TProfile, TSecondaryKey>` base interface — the four
`getById`/`list`/`upsert`/`delete` signatures are hand-repeated four
times rather than extending one shared shape. Given each store also has
a genuinely different secondary-index method, a shared base would save
four lines per interface at the cost of one more level of indirection —
a genuine but small nice-to-have, not a real problem today.

**Verdict: clean and consistent**, with sound, deliberate (not
accidental) divergence where the underlying domain differs.

---

## Check 6 — Refresh Lifecycle

Fully consistent, and improves with each platform rather than
degrading: `lib/competitors` owns the canonical
`computeNextRefresh(fromDate, priority)` / `determineRefreshPriority(confidence)`
pair (both generic — neither is typed to `CompanyProfile`), and
`lib/market`, `lib/financial`, and `lib/business` each import them
**directly from `lib/competitors`'s public barrel** rather than
re-deriving the interval-days table. Verified: all four platforms share
the exact same `urgent = 1 day / high = 7 / normal = 30 / low = 90`
policy, defined once.

Each platform still needs (and correctly has) its own thin local copy of
exactly two things that genuinely can't be shared: `isXStale(profile, now)`
(unavoidable — the shared `isStale` export is typed specifically to
`CompanyProfile`) and `buildManualXRefreshMetadata(now)` (a two-line
helper, not itself exported from `lib/competitors`'s barrel). The
four `requestManualRefresh`/`requestScheduledRefresh`/`requestStaleRefresh`/
`collectStaleX` engines are structurally identical across all four
platforms, differing only in the type they operate on.

**Verdict: clean.** This is the platform's best example of the "consume
only public exports" constraint being used as intended — one shared
policy, reused three times, instead of four independent copies.

---

## Check 7 — Scoring Review

Every scoring system — `lib/competitors` (8 dimensions, per its own
Milestone 6 spec), `lib/market`/`lib/financial`/`lib/business` (6
dimensions each, per their own specs) — is confirmed architecture-only:
every dimension function returns a fixed neutral `50`, none reads real
data, and every one carries an inline comment naming the real signal a
future implementation would use. Every composing engine
(`scoreCompany`/`scoreMarket`/`scoreFinancials`/`scoreBusiness`) is real,
working composition logic (equal-weighted average, correctly rounding)
layered on top of those placeholders — verified this is genuinely
functional (not itself a stub) in all four cases.

**No fabricated values found anywhere in a scoring path.** The one place
that could be mistaken for scoring but isn't — `lib/financial/metrics/
ltvToCacRatio.ts` — is correctly kept out of `scoring/` entirely; it's a
real, working *derived metric* (computes an actual ratio when both LTV
and CAC are known, honestly returns "unknown" otherwise), not a score,
and it lives in its own `metrics/` folder specifically so it isn't
confused with the placeholder scoring dimensions.

Future extension points are explicit and consistent: every placeholder
dimension function's doc comment names exactly what real signal would
replace its body, and every scoring engine's composition logic is
already the permanent contract — a real dimension implementation
requires no change to the engine that consumes it.

**Verdict: clean**, and this is a case where the answer to "any
architectural problems?" is genuinely no — every scoring layer already
does exactly what the spec asked for (architecture only, no invented
scores) with no gap to close.

---

## Check 8 — Documentation Review

Each of the six platform docs (`RESEARCH_ENGINE.md`,
`PROVIDER_MANAGER.md`, `COMPETITOR_PLATFORM.md`, `MARKET_PLATFORM.md`,
`FINANCIAL_PLATFORM.md`, `BUSINESS_PLATFORM.md`) exists and is genuinely
thorough — architecture, data flow, verification results, and a future
roadmap are present in all six, and each one accurately cross-references
what it reuses from the platform below it.

**Gap found, and it's real:** the repository's root `ARCHITECTURE.md`
opens with "This document ... reflects the state of the codebase after
Sprint 3" and contains **zero** mentions of `lib/research`,
`lib/competitors`, `lib/market`, `lib/financial`, or `lib/business`
(verified by direct grep, not a stale claim). `CLAUDE.md` Section 4
("Folder Rules") is equally silent on all five. Six milestones' worth of
architecture now exists with no single-page map tying them together —
a new engineer (or agent) starting cold has to open five separate `.md`
files plus explore the folder tree to reconstruct the same "research →
competitors → market → financial → business" picture this review just
verified in twenty minutes of grep. This is a direct, self-flagged gap
against `CLAUDE.md`'s own Definition of Done item 9 ("Documentation
reflects reality... Architecture changes update `ARCHITECTURE.md`").

**Verdict: gap confirmed.** See Technical Debt #2 — this is the single
most consequential finding in this review, precisely because it's the
one thing actively working against the stated goal of "verify long-term
maintainability."

---

## Check 9 — Technical Debt

### Critical
*None found.*

### Important

1. **Small utility logic is independently reimplemented in each
   platform instead of shared.** Verified concretely: `urlDedupeKey`
   (URL-comparison normalization) is implemented four times
   (`lib/competitors` — inline as `dedupeByUrl` in its profile merger —
   plus separately in `lib/market`, `lib/financial`, `lib/business`'s
   own `utils/urlNormalization.ts`, byte-identical logic, differing only
   in the explanatory comment). The generic `dedupeByKey<T>(items, keyFn)`
   helper is implemented three times (`lib/market`, `lib/financial`,
   `lib/business`). A label-normalization helper
   (`normalizeLabel`/`normalizeCompanyName`/`normalizeIndustryName`) is
   implemented four times, each a near-identical "lowercase + trim +
   collapse whitespace," with `lib/competitors`'s version additionally
   stripping legal suffixes. Each `discover*()` function's
   `computeDiscoveryConfidence()` (Market/Financial/Business) is also a
   separately-written near-duplicate of the same averaging policy. None
   of this is a bug — every copy is correct, well-commented, and was
   deliberately written this way because the constraint each milestone
   worked under was "consume only public exports," and none of these
   helpers was ever part of an upstream platform's public barrel. But it
   is real, confirmed duplication, and a sixth platform (Investor
   Intelligence) would make it a fifth copy of each. **Recommendation:**
   before or during Investor Intelligence, extract a small, explicitly
   frozen `lib/shared/` (or similarly-named) utility module — just these
   three or four pure functions — and have each platform's *next*
   version import from it. This does not require touching any of the
   five existing platforms today (they're frozen, and this review was
   told not to modify code), but it's the one piece of debt worth paying
   down deliberately rather than letting compound to a sixth or seventh
   copy.

2. **`ARCHITECTURE.md` and `CLAUDE.md`'s Folder Rules are stale relative
   to six milestones of new architecture.** See Check 8. Concretely,
   this means: (a) a new contributor reading `CLAUDE.md` today would not
   learn that `lib/research/`, `lib/competitors/`, `lib/market/`,
   `lib/financial/`, or `lib/business/` exist at all, and (b)
   `ARCHITECTURE.md`'s own "Folder Structure" section only documents
   `app/`, `components/`, `hooks/`, and the pre-Milestone-4 parts of
   `lib/`. **Recommendation:** add one new top-level section to
   `ARCHITECTURE.md` (e.g. "9. Knowledge Platforms") that gives the
   five-platform layering, the one-line purpose of each, and links out to
   its dedicated `.md` — a map, not a duplicate of the six existing docs.

### Minor

3. **No shared generic base interface for the four `*KnowledgeStore`
   types.** Each hand-repeats an identical `getById`/`list`/`upsert`/
   `delete` shape. Low cost today (four short interfaces); would start
   to matter around a sixth or seventh platform. See Check 5.

4. **The fourth storage backend's name (`vector` vs. `warehouse`)
   differs across platforms.** Confirmed intentional and spec-driven
   (Check 5), not a defect — flagged here only so a future reader doesn't
   mistake it for drift when comparing `createStore.ts` files side by
   side.

### Nice-to-have

5. A single shared `KnowledgeStoreBackend`-style factory pattern doc
   (a short section in a future master `ARCHITECTURE.md` update) showing
   the `createStore()` factory shape once, since all four platforms'
   `createStore.ts` files are now structurally identical enough to be
   generated from the same template.

---

## Future Scalability

The layering (`research → competitors → market → financial → business`)
has room for at least the two platforms already named in every existing
doc's own roadmap (Investor Intelligence, Reports/Dashboard/API) without
any structural change — each would simply become `business`'s downstream
consumer, importing only from `lib/business`'s public barrel exactly the
way `lib/business` consumes the four platforms beneath it today. The
"one schema per shape, reused via public barrel" discipline verified in
Checks 1 and 4 is precisely what makes that scaling path cheap: a sixth
platform importing `Severity`, `RefreshMetadata`, or `CustomerSegment`
costs nothing architecturally, it just imports them.

The one thing that will not scale gracefully without intervention is
Technical Debt #1 — every new platform currently pays a small "write your
own dedupe/normalize helpers" tax. That tax is flat and low today (three
or four small pure functions); it is worth paying down before it compounds
across a sixth and seventh platform, but it is not blocking anything now.

---

## Readiness for Investor Intelligence

**Ready.** Every check in this review came back clean or found only
non-blocking debt. The one substantive recommendation — updating
`ARCHITECTURE.md` — is a documentation task, not a code change, and can
happen in parallel with or immediately before Milestone 10 without
altering any of the five existing platforms. Nothing found in this audit
requires a refactor before Investor Intelligence begins.

---

## Summary

| Check | Verdict |
|---|---|
| 1. Architecture boundaries | Clean — zero deep imports, zero circular deps, verified both directions |
| 2. Public API review | Clean — minimal, consistent, nothing found that should be private |
| 3. Knowledge flow | Clean — cumulative consumption confirmed, no layer bypassed |
| 4. Schema review | Clean — zero duplicate schemas for shared concepts, full evidence/confidence propagation |
| 5. Storage review | Clean — consistent interface shape; apparent differences are deliberate |
| 6. Refresh lifecycle | Clean — genuinely shared policy, not four independent copies |
| 7. Scoring review | Clean — 100% architecture-only, zero fabricated values |
| 8. Documentation review | Gap found — root `ARCHITECTURE.md`/`CLAUDE.md` stale since Sprint 3 |
| 9. Technical debt | 0 Critical · 2 Important · 2 Minor · 1 Nice-to-have |

No architectural problems were invented to fill out this report — where
a check came back clean, it's reported as clean.
