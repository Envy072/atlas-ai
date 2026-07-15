# Atlas AI — Milestone 32 Design Specification

**Evidence Intelligence — Activating Real Research Providers**

Status: **Design only. No code, no folders, no source files modified.
No commits.**

---

# 1. Goal

**Purpose.** Turn Atlas AI's research layer from an honestly-empty
placeholder into a real source of evidence. Per `ATLAS_AI_V2_ROADMAP.md`
Section 6 (Phase 1 — Evidence Intelligence) and Section 7 (Milestone
32), this milestone's entire mandate is: activate real credentials for
Tavily and Brave, build and activate a real Crunchbase provider, and
verify — for the first time, with automated tests and one real,
manual, end-to-end check — that a live analysis produces real,
inspectable evidence instead of `not_configured`/`not_implemented`
placeholders. Nothing else.

**Why this, and why first.** `ATLAS_AI_V2_FINAL.md` Section 11 names
the single most dangerous competitor to Atlas AI today as "a founder
opening ChatGPT and typing 'analyze my startup idea' for free" — and
states plainly that Atlas AI only wins that comparison if real evidence
is actually flowing through the system. `ATLAS_AI_V2_ROADMAP.md`
Section 6 (Phase 1) calls this "the cheapest, fastest improvement
available in this entire document... a prerequisite for every future
'evidence-based' claim to be true in practice, not just in schema."
Phase 2 (Decision Intelligence — real judgment generation, Milestone
33 onward) cannot be meaningfully built or tested against a
`DecisionProfile` that carries zero real evidence; this milestone is
its direct, named prerequisite (`ATLAS_AI_V2_ROADMAP.md` Section 13,
Dependencies: "Phase 2 (Decision) ... does not begin without real
evidence data to test against realistically").

**Why this is not a new engine.** The audit below (Section 5)
establishes, with direct evidence, that Atlas AI already has a real,
working research pipeline — provider abstraction, retry/timeout
handling, a fallback-chain manager, health/metrics tracking,
deduplication, evidence construction — and that this pipeline is
**already live in production**, called directly by all five knowledge
platforms' own discovery functions and by the pipeline's own research
stage, on every analysis a founder runs today. This milestone does not
build a second research engine beside the first one, and it does not
touch any of that already-working machinery. It does exactly two
things: (1) supplies real credentials so two already-real providers
stop returning `not_configured`, and (2) writes the one provider
(`Crunchbase`) that was never actually implemented, following the
proven shape of the other two. Everything downstream of a provider's
`search()` call — retry, fallback, health, dedup, ranking, evidence
construction — is reused completely unmodified.

**Fit with long-term architecture.** `CLAUDE.md` Section 22 names
"provider swappability behind service boundaries" as a standing
architectural goal, specifically citing `generateStartupAnalysis` and
`services/projects.ts` — the same principle already governs
`lib/research/providers/`: `ResearchProvider` is one small interface
(`id`, `name`, `sourceType`, `search()`), and adding a real provider
means writing one file matching that interface and registering it in
`registry.ts`, nothing else. This milestone is the first real proof
that the pattern works exactly as designed, for exactly the third
provider the pattern was built to support.

---

# 2. Scope

### Included

- Real `TAVILY_API_KEY`/`BRAVE_API_KEY` credential values supplied by
  the repository owner (a manual, local, never-committed action — see
  Section 10) so `tavilyProvider`/`braveProvider`, both already fully
  coded, stop returning `"not_configured"` and start making real HTTP
  calls.
- A real `crunchbaseProvider.ts` implementation, replacing today's
  `buildNotImplementedResult`-only stub, following the exact shape
  already proven twice by `braveProvider.ts`/`tavilyProvider.ts`
  (`fetchWithRetry`, `SourceSchema` validation, the same four-status
  `buildResult` pattern).
- A new, empty `CRUNCHBASE_API_KEY=` line added to `.env.local` (the
  slot only — never a real value, per Section 10), matching the
  existing `TAVILY_API_KEY=`/`BRAVE_API_KEY=` pattern already present.
- **A new, dedicated test suite for `fetchWithRetry` itself**
  (`lib/research/utils/httpRequest.test.ts`) — the one shared utility
  all three providers depend on for retry, exponential backoff,
  timeout, and rate-limit (429) handling. Added following the Principal
  Architect Review's finding that provider-level mocked tests alone
  cannot prove this mechanism actually works (Section 7 explains why in
  full).
- First-ever automated tests for all three providers
  (`braveProvider.test.ts`, `tavilyProvider.test.ts`,
  `crunchbaseProvider.test.ts`) and for the health-computation function
  this milestone's own "provider health monitoring" acceptance
  criterion depends on (`health.test.ts`) — a new, small, three-times-
  reused shared test helper (`tests/mocks/fetchMock.ts`) supporting all
  three provider test files. Each provider test suite explicitly
  distinguishes three separate response categories: an **empty but
  valid** response (the provider genuinely found nothing), a
  **malformed** response (an individual result fails schema
  validation, or the response body itself isn't valid JSON), and a
  **transport failure** (a non-OK HTTP status or a network-level
  timeout) — three different states this codebase's own
  `ProviderResultStatus` enum already exists to distinguish, but which
  the original design's test plan did not enumerate separately.
- **A new `CRUNCHBASE_API_KEY` placeholder added to
  `.github/workflows/ci.yml`**, matching the existing
  `BRAVE_API_KEY`/`TAVILY_API_KEY` placeholder convention already
  present there (Section 10) — a documentation/consistency addition,
  not a behavioral change.
- One real, manual, end-to-end verification: a real analysis, run
  locally with real credentials, confirmed to produce real,
  provider-sourced evidence in the resulting `DecisionProfile`.
- Correcting two confirmed-stale documentation claims that directly
  describe this exact subsystem (`lib/research/index.ts`'s header
  comment, `RESEARCH_ENGINE.md`'s "Status" line) — both currently
  assert research is "not wired into the application," which direct
  audit (Section 5) proves false today.

### Excluded (see Non-Goals, Section 4)

- Any change to the ranking engine's composition logic
  (`rankSources()`), the deduplication logic (`dedupeSources()`), the
  evidence-construction logic (`buildEvidence()`), the fallback-chain
  or retry logic (`providerManager.ts`), or any of the five knowledge
  platforms that already call `runResearch()`.
- Implementing real ranking **factors** (`scoreAuthority`,
  `scoreFreshness`, `scoreRelevance`, `scoreTrust`,
  `scoreSourceQuality`) — all five are today hardcoded, honestly-
  labeled placeholders (`lib/research/ranking/factors.ts`), and stay
  that way. A separate, already-named, differently-scoped piece of
  future work (Section 4).
- Any of the four remaining unimplemented providers (`google`, `bing`,
  `reddit`, `github`, `news`, `company_website`, `government_dataset`)
  — Crunchbase is the one the Roadmap names for this milestone; no
  other placeholder provider is touched.
- Any change to `lib/decision/`, judgment generation, or any
  Decision-Intelligence-facing output. This milestone supplies raw
  material; it computes and decides nothing.
- Automated testing of `providerManager.ts`'s fallback/retry
  orchestration or `metrics.ts`'s stateful recording — both are
  existing, already-live logic this milestone relies on but does not
  modify; adding their first tests is real, valuable, separately-scoped
  work (Section 16), not folded into this milestone's own scope.
- Billing, pricing, onboarding, or anything from
  `ATLAS_AI_V2_ROADMAP.md` Phase 3, 4, or 5.

**Feature-creep guard:** every deliverable below either (a) supplies a
credential/environment slot, (b) writes one new provider file matching
an interface and pattern already proven twice, or (c) is a new test
observing existing or newly-written behavior. If a deliverable would
change what any consumer of `runResearch()` receives beyond "more real
sources, same shape as before," it does not belong in this milestone.

---

# 3. Deliverables

1. **Real credential values for `TAVILY_API_KEY` and `BRAVE_API_KEY`**
   — supplied by the repository owner directly into their own local
   `.env.local`, never by this milestone's implementer and never
   committed (Section 10). This design specifies *where* the value
   goes and *how* it's verified; obtaining and entering the actual key
   is explicitly outside what any commit in this milestone does.
2. **`lib/research/providers/crunchbaseProvider.ts`** — rewritten from
   its current 13-line stub into a real provider, matching
   `braveProvider.ts`/`tavilyProvider.ts`'s exact internal shape: a
   `buildResult()` helper producing the same four-field
   `ProviderResult` (`providerId`, `query`, `status`, `sources`,
   `fetchedAt`, `tookMs`, optional `error`); a `not_configured` early
   return when `CRUNCHBASE_API_KEY` is unset; a `normalizeResults()`
   function mapping Crunchbase's response fields into `SourceSchema`-
   valid `Source` objects (`sourceType: "business_database"`, already
   a valid `SourceType`, confirmed in `schemas/enums.ts`); a
   `fetchWithRetry()` call with the same `{ timeoutMs: 8000, maxRetries:
   2 }` policy Brave/Tavily already use; the same `ok`/`error`/
   `timeout` branching on the response. **A named, honest uncertainty**
   (Section 12): Crunchbase's exact response shape has never been
   integrated against in this codebase before (unlike Brave/Tavily,
   whose shapes were already modeled from their real, documented APIs)
   — the field mapping in this design is a best-effort, schema-
   conformant mapping, reviewed against Crunchbase's public API
   documentation, and confirmed correct only once the manual,
   real-credential verification (Acceptance Criterion 9, Section 13)
   actually runs against it.
3. **`CRUNCHBASE_API_KEY=`** — one new, empty line added to
   `.env.local`, matching the existing pattern for
   `TAVILY_API_KEY=`/`BRAVE_API_KEY=`. Never a real value (Section 10).
4. **`.github/workflows/ci.yml` — one new placeholder line.** Added per
   the Principal Architect Review (Finding 4, Section 17): a
   `CRUNCHBASE_API_KEY: "placeholder-not-a-real-key"` entry, matching
   the existing `BRAVE_API_KEY`/`TAVILY_API_KEY` placeholder lines
   already present in this file (confirmed by direct read, Section 5).
   Purely a consistency addition — neither existing key uses a
   non-null assertion that would make its absence fail the build, and
   this one won't either; the change is documentation-equivalent, not
   behavioral, and introduces zero real secret into CI.
5. **`tests/mocks/fetchMock.ts`** — a small, shared test helper wrapping
   `vi.stubGlobal("fetch", ...)`/`vi.unstubAllGlobals()`, used by all
   three provider test files below. Promoted to a shared helper at
   exactly its third use (`CLAUDE.md` Section 11's "three repetitions"
   rule for `components/shared/`, applied identically here to test
   infrastructure) rather than duplicated three times or promoted
   speculatively after one.
6. **`lib/research/utils/httpRequest.test.ts`** (new — added per the
   Principal Architect Review, Finding 1, Section 17) — the first-ever
   automated test for `fetchWithRetry`, the one shared utility all
   three providers depend on for retry, backoff, timeout, and
   rate-limit handling. **Why this is a separate deliverable from the
   three provider test files below, not something they already cover**:
   a provider test that mocks `fetch` to resolve or reject once (as
   Deliverables 7–9 do) only proves the *provider* correctly classifies
   an outcome it's handed — it never exercises `fetchWithRetry`'s own
   internal retry loop, its exponential backoff delay, or its real
   `AbortController`/`setTimeout`-driven timeout, because a single
   canned mock response never gives that loop a reason to run more than
   once. Testing retry/backoff/rate-limit behavior only ever
   indirectly, through three separate provider test files that each
   happen not to exercise it, would leave the actual mechanism
   completely unverified while looking, from the deliverable list
   alone, like it was covered three times over. This suite tests
   `fetchWithRetry` directly and in isolation, using Vitest's fake
   timers (`vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync()`) so no
   test waits on a real delay:
   - a `429` response followed by a successful response on retry
     resolves with the successful response (rate-limit retry, and
     successful retry after a transient failure, in one case);
   - a `500` response repeated across every attempt exhausts
     `maxRetries` and resolves with the last (non-OK) response, not a
     throw;
   - a `404` response is returned immediately, with no retry attempted
     (a 4xx other than 429 is not retryable, per `isRetryableStatus`);
   - backoff delay between attempts is asserted to double each retry
     (`baseBackoffMs * 2 ** attempt`), confirmed via fake-timer
     advancement, not a real wall-clock wait;
   - a call that never resolves before `timeoutMs` elapses is aborted
     by the real `AbortController` wiring and rejects with a
     `RequestTimeoutError` — proving the actual timeout mechanism
     fires, not just that a provider correctly labels an
     already-thrown `RequestTimeoutError`.
7. **`lib/research/providers/braveProvider.test.ts`** (new — this
   function's first-ever automated test), explicitly distinguishing
   three separate response categories rather than one undifferentiated
   "error" case: `not_configured` when `BRAVE_API_KEY` is unset (via
   `vi.stubEnv`, no mock needed); a successful, non-empty response
   correctly normalized into `Source[]` (including
   `positionBasedConfidence`'s decay); **an empty-but-valid response**
   — the provider genuinely found nothing, asserted separately as
   `status: "ok"` with `sources: []`, not conflated with a malformed
   result; **a malformed response** — both an individually malformed
   result (missing `url`/`title`, skipped without failing the whole
   call) and a response body that isn't valid JSON (`response.json()`
   throwing, caught by the provider's existing `try`/`catch` and
   producing `"error"`, not an unhandled rejection); **a transport
   failure** — a non-OK HTTP status producing `"error"`, and a
   simulated abort producing `"timeout"` via `RequestTimeoutError`.
   Retry/backoff mechanics themselves are not re-tested here — that's
   Deliverable 6's job; this suite tests only Brave's own
   classification and normalization of an outcome it's handed.
8. **`lib/research/providers/tavilyProvider.test.ts`** (new — this
   function's first-ever automated test): the same categories as
   Deliverable 7 — empty-but-valid, malformed (individual result and
   invalid JSON body), and transport failure (error and timeout) —
   adapted to Tavily's own response shape and its real
   `score`-to-`confidence` mapping (`toConfidence()`), including the
   documented fallback to a neutral 50 when Tavily omits `score`
   entirely.
9. **`lib/research/providers/crunchbaseProvider.test.ts`** (new — the
   new provider's first test, written alongside Deliverable 2): the
   same category shape as Deliverables 7–8, adapted to Crunchbase's
   mapped response fields and its `business_database` source type.
10. **`lib/research/manager/health.test.ts`** (new — this function's
    first-ever automated test, `computeHealth()`'s "no LLM usage" pure
    logic): the "too little history" optimistic default (fewer than 3
    attempts stays `"healthy"`); the two real thresholds
    (`OFFLINE_FAILURE_RATE`/`DEGRADED_FAILURE_RATE`) each correctly
    crossed and not-crossed. This is the concrete verification behind
    this milestone's own "provider health monitoring" acceptance
    criterion (inherited from `ATLAS_AI_V2_ROADMAP.md`'s consolidation
    of the former Milestones 32/33/34 into this single one) — a claim of
    "health monitoring works" is only real once the function computing
    health has its own test, not just an inspectable log line.
11. **`lib/research/index.ts` — one-line comment correction.** The
    module's own header currently reads "Nothing outside lib/research/
    imports from this yet" — confirmed false by direct grep (Section 5):
    six real call sites already import and call `runResearch()`
    directly. Corrected to state the actual, current callers. This
    correction depends only on those six call sites already existing
    today (they do, confirmed in Section 5.3) — not on Deliverable 2
    (Crunchbase) being complete (Section 15's dependency wording is
    loosened accordingly, per the Principal Architect Review's Finding
    9).
12. **`RESEARCH_ENGINE.md` — Status line correction.** Line 9's "Status:
    not wired into the application" (and its supporting claim that
    "Nothing in `lib/analysis/`, `lib/services/`, `app/api/`,
    `lib/store/`, or `lib/schemas/` imports from `lib/research/`") is
    the same confirmed-stale claim as Deliverable 11, in this project's
    own architecture documentation rather than a code comment — same
    correction, same evidence, same "documentation reflects reality"
    discipline every prior milestone in this project has followed
    (most recently, `DECISION_PLATFORM.md`'s status-line correction at
    Milestone 31). Same loosened dependency as Deliverable 11.

Nothing else changes.

---

# 4. Non-Goals

- **Ranking factor implementation** (`scoreAuthority`, `scoreFreshness`,
  `scoreRelevance`, `scoreTrust`, `scoreSourceQuality`). All five remain
  exactly what `lib/research/ranking/factors.ts`'s own doc comment
  already says they are: "ARCHITECTURE ONLY... every function below
  returns a fixed, neutral placeholder (50/100)," explicitly deferred
  in that same comment to "Milestone 4 Phase 2+" (an earlier numbering
  scheme's own name for this future work — the reasoning holds
  regardless of numbering). Real sources will flow through
  `rankSources()` once this milestone ships, but every source will
  score identically (50) until that separate, already-named work
  happens. Named explicitly here, and again in Risks (Section 12), so
  this milestone's success is never mistaken for "ranking now works."
- **`providerManager.ts`'s fallback/retry orchestration, and
  `metrics.ts`'s stateful recording** — both real, both already live in
  production, both currently untested. Adding their first tests is
  real, valuable follow-up work (Section 16), deliberately not folded
  into this milestone, which tests only the layer it directly changes
  (the three providers) plus the one function (`computeHealth`) its own
  acceptance criteria explicitly depend on.
- **The other four unimplemented providers** (`google`, `reddit`,
  `github`, `news` — each currently a `buildNotImplementedResult`-only
  stub, confirmed by direct read, structurally identical to
  Crunchbase's prior state). None is named by
  `ATLAS_AI_V2_ROADMAP.md` for this milestone. Each is a real,
  bounded, future candidate for a milestone shaped exactly like this
  one's Crunchbase work, once its own value is prioritized.
- **Any provider health/metrics UI or dashboard.**
  `ATLAS_AI_V2_ROADMAP.md` Section 7 (Milestone 32) is explicit: "no
  visible monitoring dashboard — a text log is sufficient at this
  early stage." The existing `error`/`fetchedAt`/`tookMs` fields on
  every `ProviderResult`, and `getMetricsSnapshot()`/
  `getAllMetricsSnapshots()`'s existing, unmodified return values, are
  the only "monitoring" this milestone provides — inspectable via
  existing code, not a new surface.
- **Real judgment generation, verdict synthesis, or anything in
  `lib/decision/`'s `derive*()`/`build*()` functions.** Those remain
  exactly as honestly-empty as `MILESTONE_31_DESIGN.md` left them —
  `ATLAS_AI_V2_ROADMAP.md` Phase 2 (Milestone 33 onward), not this
  milestone.
- **Any UI, route, or component change.** This milestone is entirely
  `lib/research/` plus test files plus two documentation corrections —
  zero product-visible surface changes anywhere.
- **A general-purpose Supabase-style mocking library for `fetch`.**
  `tests/mocks/fetchMock.ts` (Deliverable 5) wraps Vitest's own built-in
  `vi.stubGlobal`/`vi.unstubAllGlobals` — a thin, few-line helper, not a
  new abstraction layer modeling a request/response framework this
  codebase's three providers don't need.
- **Obtaining, choosing, or committing any real API key value**,
  for any of the three providers. Explicitly and permanently the
  repository owner's own action, outside any commit, for the same
  reason `CLAUDE.md` Section 16 already states: "Environment variables
  never get committed... never hardcoded or logged in full."

---

# 5. Current State Audit

Every claim below is from a direct read or command run this session,
not memory, and not carried over from `ATLAS_AI_V2_ROADMAP.md`'s own
description of this milestone (which this audit both confirms and, in
one material respect, corrects — see the Crunchbase finding below).

## 5.1 Provider inventory — the one finding that reshapes this milestone's scope

`ATLAS_AI_V2_ROADMAP.md` describes Milestone 32 as "Activate Real
Research Providers (Tavily, Brave, Crunchbase)," and its Phase 1
description assumes all three are "fully-coded research providers,"
needing only credentials. **Direct read of all three provider files
confirms this is true for two of the three, and false for the
third:**

| Provider | File | Confirmed state |
|---|---|---|
| Tavily | `braveProvider.ts`'s sibling, `tavilyProvider.ts` (149 lines) | **Real, fully-coded.** A real POST to `https://api.tavily.com/search`, real response parsing, a real per-result relevance score mapped to `Source.confidence`, real retry/timeout handling via `fetchWithRetry`. Returns `"not_configured"` today **only** because `process.env.TAVILY_API_KEY` is unset — the code path that would use a real key already exists and is exercised by nothing else in this environment. |
| Brave | `braveProvider.ts` (147 lines) | **Real, fully-coded**, same shape: a real GET to `https://api.search.brave.com/res/v1/web/search`, a real (if heuristic, honestly-documented) position-based confidence score, real retry/timeout handling. Same `"not_configured"` cause: `process.env.BRAVE_API_KEY` unset. |
| **Crunchbase** | `crunchbaseProvider.ts` (13 lines) | **Not real.** Its entire body is: `return buildNotImplementedResult("crunchbase", query, startedAt);` — no HTTP call, no response parsing, no credential check of any kind. Its own comment states this plainly: `"// Architecture only — no real Crunchbase API call yet."` No `CRUNCHBASE_API_KEY` environment variable exists anywhere in this repository (confirmed: absent from `.env.local`, absent from every `.github/workflows/*.yml`, absent from every grep for the string `CRUNCHBASE`). |

**Correction to the Roadmap's framing, made explicitly rather than
silently absorbed:** "activating" Crunchbase is not a credential-only
task the way it is for Tavily/Brave — it requires writing a real
provider implementation, because none exists today. This is real,
additional engineering work, not zero-cost activation — sized and
risked accordingly in this design (Sections 6, 12), reusing the exact,
now-twice-proven pattern rather than inventing a new one. The
Roadmap's own underlying goal — three real, evidence-producing
providers live by the end of this milestone — is unaffected and is
exactly what this design still delivers; only the *shape* of the work
for one of the three differs from what was assumed when the Roadmap
was written.

## 5.2 The research engine's already-working machinery — confirmed live, confirmed reused unmodified

Direct read of every layer between a provider's `search()` call and a
knowledge platform's own `discoverX()` function:

- **`orchestrator/researchOrchestrator.ts`'s `runResearch()`** — the
  one public entry point. Real, working composition:
  `searchViaProviderManager()` → merge sources across providers →
  `dedupeSources()` → `rankSources()` → `buildEvidence()` per ranked
  source → assemble and schema-validate a `ResearchResult`. Confirmed
  unmodified by this milestone.
- **`manager/providerManager.ts`'s `searchViaProviderManager()`** — real
  fallback-chain logic (`FALLBACK_CHAINS`, today exactly one entry:
  `search_engine: ["tavily", "brave"]`), real per-attempt retry
  (`callProviderWithRetry`, up to 1 additional attempt on `error`/
  `timeout` only — `not_configured`/`not_implemented` are correctly
  never retried, since retrying a structurally-guaranteed-identical
  outcome would waste a full timeout window for nothing), and real
  metrics recording (`recordAttempt`, correctly skipped for
  `not_configured`/`not_implemented` outcomes so a never-attempted
  provider doesn't silently look like a failing one). Confirmed
  unmodified by this milestone.
- **`manager/health.ts`'s `computeHealth()`** — real, working threshold
  logic (optimistic below 3 recorded attempts; `offline` at ≥80%
  failure rate; `degraded` at ≥30%). Zero test coverage today
  (confirmed: `find lib/research -iname "*.test.ts"` returns nothing at
  all, for any file in this module). This milestone adds its first test
  (Deliverable 10) because this milestone's own "health monitoring"
  acceptance criterion depends on it being correct, not because this
  milestone changes its logic.
- **`utils/deduplication.ts`'s `dedupeSources()`** and
  **`utils/normalization.ts`'s `normalizeUrl()`/`extractDomain()`** —
  real, pure, already-correct logic (URL-normalization-based
  deduplication, tracking-parameter stripping). Confirmed unmodified.
- **`ranking/rankingEngine.ts`'s `rankSources()`** — real composition/
  sorting logic. **Its inputs are not yet real**, per the
  `ranking/factors.ts` finding below.
- **`ranking/factors.ts`** — **every one of its five scoring functions
  returns a hardcoded `50`**, confirmed by direct read of its own doc
  comment: *"ARCHITECTURE ONLY — every function below returns a fixed,
  neutral placeholder (50/100), not a real score... these functions are
  unreachable with real data until a provider is implemented."* That
  condition — "until a provider is implemented" — becomes true the
  moment this milestone ships. **Material, honest consequence, named
  here and in Risks (Section 12):** once real sources flow in, every
  one of them will score exactly 50, so `rankSources()`'s sort order
  will not yet reflect any real prioritization — sources will be
  correctly deduplicated and evidenced, but not yet meaningfully
  ranked relative to one another. This is real evidence flowing
  through a real (if not-yet-discriminating) ranking stage, which is
  what this milestone promises — not real *ranking quality*, which it
  explicitly does not.
- **`evidence/evidenceBuilder.ts`'s `buildEvidence()`** — real, schema-
  validated `Evidence` construction from a ranked `Source`. Confirmed
  unmodified.

## 5.3 Confirmed: research is already live in production — two stale documentation claims found and corrected

`ATLAS_AI_V2_ROADMAP.md`'s own framing of Phase 1 depends on real
evidence, once flowing, actually reaching `DecisionProfile` — this was
verified directly, not assumed, and in the process surfaced a real
documentation-drift finding:

**Confirmed live callers of `runResearch()`** (direct grep across the
entire repository, excluding `lib/research/` itself):

```
lib/pipeline/stages/research.ts             (the pipeline's own research stage)
lib/financial/knowledge/financialDiscovery.ts
lib/business/knowledge/businessDiscovery.ts
lib/market/knowledge/marketDiscovery.ts
lib/competitors/discovery/competitorDiscovery.ts
lib/decision/engine/decisionEngine.ts
```

Six real, independent call sites — every one of the five knowledge
platforms plus the pipeline's own dedicated research stage. This
confirms, concretely, that once this milestone ships, real evidence
will reach `DecisionProfile` through the exact same, already-live path
every analysis already runs today — no new wiring is needed anywhere
in `lib/pipeline/`, `lib/financial/`, `lib/business/`, `lib/market/`,
`lib/competitors/`, or `lib/decision/` to make this true.

**The stale claims this confirms, and corrects (Deliverables 11–12):**
`lib/research/index.ts`'s own header comment — *"Nothing outside
lib/research/ imports from this yet"* — and `RESEARCH_ENGINE.md`'s own
"Status" line — *"not wired into the application... Nothing in
`lib/analysis/`, `lib/services/`, `app/api/`, `lib/store/`, or
`lib/schemas/` imports from `lib/research/`"* — are both **directly
contradicted** by the six call sites above. Both were accurate at the
time they were written (an earlier phase of this project's numbering,
before the six knowledge platforms existed) and were never updated once
those platforms were built and wired. This is the same category of
documentation drift `MILESTONE_30_DESIGN.md` named (and deliberately
did not fix, as out of scope) for `CLAUDE.md`'s stale
`useAnalyzeStartup` reference — the difference here is that this
drift is *inside the exact subsystem this milestone modifies*, so
correcting it is directly in scope rather than an unrelated drive-by
fix.

## 5.4 Test infrastructure — confirmed absent, confirmed reusable

- `find lib/research -iname "*.test.ts"` returns **zero results** —
  no file in this module has ever had an automated test, matching this
  module's own age (unchanged in this respect since before Milestone
  30 introduced this project's test harness at all).
- The three-tier testing pattern (pure / mocked-dependency /
  integration) and the co-located `*.test.ts` convention, both
  established at Milestone 30, apply directly: every new test this
  milestone adds is Tier 2 (mocked external dependency) — the function
  under test is real, the one thing it talks to (`fetch`, for the
  providers and for `fetchWithRetry` itself; nothing external, for
  `computeHealth`) is a controlled substitute. No new tier is
  introduced. `fetchWithRetry`'s own test (Deliverable 6) additionally
  uses Vitest's fake-timer APIs (`vi.useFakeTimers()`,
  `vi.advanceTimersByTimeAsync()`) for its backoff/timeout assertions —
  the same category of tool `decisionConfidence.test.ts` already
  established a precedent for (`vi.setSystemTime`, Milestone 30), not a
  new testing technique introduced for the first time here.
- **A finding this milestone's own audit surfaced, and this design now
  closes rather than leaves open (Principal Architect Review, Finding
  1):** provider-level tests that mock `fetch` to resolve or reject
  exactly once, as Deliverables 7–9 do, never exercise
  `fetchWithRetry`'s actual retry loop, its exponential backoff delay,
  or its real `AbortController`-driven timeout — they only prove a
  provider correctly labels an outcome it's handed. Without a test
  targeting `fetchWithRetry` directly (Deliverable 6), this milestone's
  own "retry behaviour" and "rate-limit handling" claims would rest on
  code that has never actually been exercised by any test, despite
  three provider test files existing.
- **No existing fetch-mocking helper exists anywhere in this
  repository** (confirmed: `tests/mocks/` today contains only
  `supabaseClient.ts`, Milestone 30). Vitest's own `vi.stubGlobal`/
  `vi.unstubAllGlobals` APIs (confirmed present in the installed
  `vitest` version's own type definitions) are the built-in mechanism
  this design uses, matching this project's own established preference
  for a project's built-in mocking primitives over a new dependency
  (the same reasoning `MILESTONE_30_DESIGN.md` Section 16 already
  applied when it removed a path-alias dependency in favor of a
  two-line manual config).
- **A genuine, new constraint this milestone's own subject matter
  introduces, absent from Milestones 29–31**: real network calls
  cannot be part of any automated test, per this project's own,
  already-established security stance (`MILESTONE_30_DESIGN.md`
  Section 10: no real secret is ever supplied to CI; Section 12: "no
  test in this milestone's scope makes a real network call... the most
  common source of CI flakiness"). This milestone's subject matter *is*
  real network calls to paid, rate-limited third-party APIs — so unlike
  every prior milestone, this one requires a genuinely separate,
  honestly-named manual verification step (Acceptance Criterion 9,
  Section 14) for the one thing automated tests structurally cannot
  prove: that real credentials against real, live APIs actually work
  end-to-end.

## 5.5 Environment configuration — confirmed present, confirmed incomplete

`.env.local` (git-ignored, confirmed unchanged since before this
milestone) already declares five keys: `OPENAI_API_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`TAVILY_API_KEY`, `BRAVE_API_KEY` — all present as empty (`KEY=`)
lines, confirming the slots already exist and simply await real
values. **No `.env.example` or equivalent template file exists
anywhere in this repository** — an existing gap, not introduced by
this milestone, and not fixed by it (out of scope: creating one is a
reasonable, separate, small future item, not named by
`ATLAS_AI_V2_ROADMAP.md` for this milestone). No `CRUNCHBASE_API_KEY`
line exists yet in `.env.local` — added as an empty slot (Deliverable
3), matching the existing pattern exactly.

## 5.6 Architectural constraints

- **`ResearchProvider` is the one, stable interface** (`lib/research/
  types/provider.ts`) every provider implements: `id`, `name`,
  `sourceType`, `search(query): Promise<ProviderResult>`. Confirmed
  unmodified and unchanged by this milestone — the Crunchbase provider
  (Deliverable 2) implements this exact, existing interface, adding
  nothing to it.
- **`SourceSchema`/`ProviderResultSchema`/`ProviderResultStatusSchema`
  already fully support a real Crunchbase provider** — `crunchbase` is
  already a valid `ProviderId`, `business_database` is already a valid
  `SourceType`, and the five-value `ProviderResultStatus` enum
  (`ok`/`error`/`timeout`/`not_implemented`/`not_configured`) already
  distinguishes exactly the states a real-but-unconfigured provider and
  a not-yet-implemented one need — confirmed by direct read of
  `schemas/enums.ts`'s own doc comment: *"'not_configured' is distinct
  from 'not_implemented': the provider's search() is real code... but
  no API key/credential is present."* Zero schema changes are needed
  anywhere in this design.
- **"Never fabricate data"** (`CLAUDE.md` Section 1) — the Crunchbase
  provider must follow the exact discipline Brave/Tavily already
  establish: an individually malformed result is skipped
  (`SourceSchema.safeParse`), never coerced or defaulted into a
  fabricated-but-valid `Source`; a `confidence` value is always a real
  or explicitly-documented-heuristic number, never a silently invented
  one (matching `braveProvider.ts`'s own documented
  `positionBasedConfidence` precedent for a provider whose real API
  doesn't supply a relevance score).
- **Secrets are never logged, in headers or in error messages** — both
  existing providers already enforce this (`safeUrlForLogging` strips
  query strings; Brave sends its key as a header, never a query param;
  Tavily sends its key in a POST body, never in a URL or a log
  statement). The new Crunchbase provider must follow the identical
  discipline, whichever of these two patterns matches Crunchbase's own
  real, documented authentication mechanism (confirmed at
  implementation time, against Crunchbase's real API documentation,
  not assumed here).
- **No LLM usage anywhere in this milestone** — consistent with every
  layer this milestone touches; `lib/services/openai.ts` is untouched
  and uncalled.
- **CI must never receive a real secret** (`MILESTONE_30_DESIGN.md`
  Section 10, unchanged) — this milestone's new automated tests
  (Deliverables 6–10) all run against mocked `fetch`, never a real
  network call, so CI's existing placeholder-env-value strategy
  requires no change beyond Deliverable 4's own new placeholder line,
  and no real secret is ever introduced into GitHub Actions.

---

# 6. User Flows

### A founder runs a real analysis (the golden path this milestone unlocks)

1. A founder submits an idea, exactly as today.
2. The pipeline's `researchStage` (unchanged) calls `runResearch()`
   (unchanged), which calls `searchViaProviderManager()` (unchanged),
   which now calls three real providers instead of two real-but-
   unconfigured ones and one stub.
3. Tavily and Brave (now configured) make real HTTP calls and return
   real `Source[]` results; Crunchbase (now implemented and configured)
   does the same.
4. Sources are deduplicated (unchanged), ranked (unchanged mechanism,
   placeholder factor scores — Section 5.2), and turned into real
   `Evidence[]` (unchanged).
5. Every knowledge platform that already calls `runResearch()`
   (financial, business, market, competitors, decision) now receives
   real evidence instead of an empty result — with zero code change to
   any of those five files.
6. The resulting `DecisionProfile`'s `evidence`/`sources` fields
   (already fully rendered by `TrustPanel`/`EvidenceList`, per
   `MILESTONE_31_DESIGN.md`'s own audit) now show real, inspectable,
   non-fabricated evidence for the first time in this environment.

### A provider's credential is missing or a call fails (already-handled, now real cases instead of the only case)

1. A founder runs an analysis with, say, `CRUNCHBASE_API_KEY` unset (a
   founder's environment might reasonably enable Tavily/Brave first,
   Crunchbase later).
2. Crunchbase's `search()` returns `"not_configured"`, exactly as
   Brave/Tavily do today when unset — the existing, unchanged
   `isUsableResult`/fallback/metrics logic already treats this
   correctly (no retry, no false failure recorded).
3. The analysis completes using whichever providers *are* configured —
   the existing graceful-degradation behavior this milestone relies on
   and does not need to build.

### A real API call errors or times out

1. Tavily returns an HTTP 500 → `braveProvider`'s already-existing
   error branch returns `"error"`; `providerManager` retries once
   (existing, unchanged logic); if still failing, the fallback chain
   moves to Brave (existing, unchanged).
2. Every one of these paths already exists and is already exercised in
   production against `"not_configured"`/`"not_implemented"` — this
   milestone's manual verification (Acceptance Criterion 9) additionally
   confirms they behave identically against a genuine `"error"`/
   `"timeout"` from a real, live API, not just a synthetic one.

### Edge case — this milestone's automated tests never make a real network call

Every new test (Deliverables 6–10) runs against a mocked `fetch` or
against no network dependency at all (`computeHealth`) — confirmed by
design (Section 7), not just described.

---

# 7. Architecture

### Why Crunchbase gets a real implementation here, not a new abstraction

The temptation, given Crunchbase's stub state, is to generalize —
build some shared "real HTTP provider" base/helper that Brave, Tavily,
and Crunchbase all extend, since all three now share the same shape.
**Rejected, examined directly**: Brave and Tavily already independently
implement the exact same shape (a `buildResult()` helper, a
`normalizeResults()` function, the same `fetchWithRetry` call) without
sharing a base class or a shared factory — this is the second, not the
first, repetition of that shape, and `CLAUDE.md` Section 11's own
promotion rule is three repetitions, not two. Introducing a shared
abstraction now, for a shape that has only ever needed a human to
copy roughly 40–50 lines of well-understood, already-reviewed code
twice, would be exactly the "trading a small present convenience for a
larger future cost" `CLAUDE.md`'s Engineering Philosophy (Section 2)
warns against — a shared base class across three tiny, independently-
evolving providers (each with its own auth mechanism, its own response
shape, its own confidence heuristic) would need enough escape hatches
to accommodate all three that it would likely save little real code
while adding a layer every future provider author has to understand
first. If a fourth real provider is ever added (Section 4's Non-Goals
lists four remaining candidates), *that* would be three repetitions of
the pattern, and the question of promotion should be asked again then
— not preemptively answered here for a repetition count of two.

### Why `tests/mocks/fetchMock.ts` *is* promoted, while a shared provider base is not

This is not an inconsistency — it's the same rule applied to two
different repetition counts. The fetch-mocking helper is used by
**three** new provider test files in this milestone alone
(Deliverables 7, 8, 9) — it meets the three-repetition threshold
*within this single milestone*, unlike the provider implementation
shape, which has only been written twice, once per milestone, years
apart. Promoting the mock now and not the provider shape is the
threshold rule applied correctly, not applied selectively.
`lib/research/utils/httpRequest.test.ts` (Deliverable 6) deliberately
does **not** use `tests/mocks/fetchMock.ts`'s single-shot helpers — it
needs sequential, multi-call mock behavior (a first call failing, a
second succeeding) and fake-timer control that a one-response-per-call
helper isn't shaped for, so it stubs `fetch` directly via
`vi.stubGlobal` with its own `vi.fn().mockResolvedValueOnce(...).
mockResolvedValueOnce(...)` chain. This is not a second, competing mock
abstraction — it is the same underlying Vitest primitive
(`vi.stubGlobal("fetch", ...)`) used one level closer to the metal,
for the one test file that genuinely needs finer control than the
shared helper's simpler, single-response case is built for.

### Provider structure — unchanged interface, one newly-real implementation

```
lib/research/providers/
  braveProvider.ts         (unchanged — already real)
  tavilyProvider.ts        (unchanged — already real)
  crunchbaseProvider.ts    (rewritten: stub → real, same exported shape)
  crunchbaseProvider.test.ts   (new)
  braveProvider.test.ts        (new)
  tavilyProvider.test.ts       (new)
  registry.ts              (unchanged — crunchbaseProvider is already
                             registered; the registry doesn't know or
                             care whether a provider is a stub or real)
```

`registry.ts`'s own existing comment already anticipated exactly this
moment: *"'tavily' and 'brave' are real... the rest remain typed
placeholders... Bing, company-website, and government-dataset
providers are already valid `ProviderId`s... adding their real modules
later means writing the file and adding one entry here, nothing
else."* This milestone is that comment's own prediction, for
Crunchbase specifically — no change to `registry.ts` itself is needed,
since Crunchbase is already registered; only its implementation
changes.

### Crunchbase provider — internal shape, following the proven pattern exactly

```ts
const CRUNCHBASE_ENDPOINT = "..."; // Crunchbase's real, documented search endpoint

interface CrunchbaseApiResult { /* narrow subset of Crunchbase's real response */ }
interface CrunchbaseApiResponse { /* ... */ }

function buildResult(status, sources, topic, startedAt, error?): ProviderResult { /* identical shape to Brave/Tavily's own buildResult */ }

function toConfidence(...): number { /* Crunchbase-specific: a real signal if the API
  provides one (e.g. a company "rank" or data-completeness score), otherwise an
  honestly-documented heuristic, following braveProvider.ts's own precedent for
  a provider with no native relevance score */ }

function normalizeResults(results, retrievedAt): Source[] { /* maps Crunchbase's
  company-record fields into SourceSchema's shape; sourceType: "business_database" */ }

export const crunchbaseProvider: ResearchProvider = {
  id: "crunchbase",
  name: "Crunchbase",
  sourceType: "business_database",
  async search(query) {
    // 1. not_configured if CRUNCHBASE_API_KEY unset
    // 2. real fetchWithRetry call, Crunchbase's real auth mechanism
    // 3. ok/error/timeout branching, identical to Brave/Tavily
  },
};
```

The exact request shape (query parameters vs. header vs. body
authentication; the real field names in a Crunchbase search response)
is confirmed against Crunchbase's real, current API documentation at
implementation time — this design commits to the pattern and the
contract (`ResearchProvider`, `ProviderResult`, `Source`), not to
guessed field names that could drift from Crunchbase's real API by the
time this milestone is implemented.

### Test architecture — Tier 2, extending Milestone 30's pattern to a new kind of external dependency

Milestone 30 established mocking one external dependency
(`@supabase/supabase-js`) via a small, hand-rolled, typed mock. This
milestone applies the identical philosophy to a different external
dependency — the global `fetch` function — rather than inventing a
new testing tier:

```ts
// tests/mocks/fetchMock.ts
export function mockFetchOnce(response: Partial<Response> & { ok: boolean; status: number; json: () => Promise<unknown> }): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response));
}

export function mockFetchTimeout(): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(
    Object.assign(new DOMException("Aborted", "AbortError"))
  ));
}

export function restoreFetch(): void {
  vi.unstubAllGlobals();
}
```

Each provider test file calls `restoreFetch()` in an `afterEach`
(matching `MILESTONE_30_DESIGN.md`'s own established discipline of
never leaking a stub/mock across test cases). No test in this
milestone's scope ever calls the real, global `fetch` against a real
endpoint — confirmed by design, and enforced structurally: every test
case explicitly stubs `fetch` before invoking `.search()`.

### Documentation architecture — corrected status lines only, no restructuring

Deliverables 11 and 12 are narrow, one-paragraph corrections to
existing prose — neither `lib/research/index.ts`'s export list nor
`RESEARCH_ENGINE.md`'s six-layer architecture description (Section
"Architecture," confirmed accurate and unchanged by this audit) is
restructured. Only the specific, confirmed-false "not wired" claims
are corrected, matching the narrow, surgical documentation-correction
precedent `MILESTONE_31_DESIGN.md` Section 3, Deliverable 9 already
set for `DECISION_PLATFORM.md`.

---

# 8. Data Model

**No schema changes.** `SourceSchema`, `ProviderResultSchema`,
`ProviderIdSchema`, `SourceTypeSchema`, `ProviderResultStatusSchema`
already fully support everything this milestone produces — confirmed
directly (Section 5.6), not assumed. **No database changes** — this
milestone touches zero persisted state; `metrics.ts`'s in-memory `Map`
(unchanged) remains this module's only "storage," exactly as it is
today for Brave/Tavily's existing metrics.

---

# 9. API Contract

**No new or changed API route.** This milestone is entirely internal
to `lib/research/` plus test files plus two documentation files —
nothing here is reachable via HTTP from Atlas AI's own frontend, and
nothing in this milestone changes the shape of any object a route or
component ever receives. A caller of `runResearch()` today receives a
`ResearchResult` with (previously) mostly `not_configured`/
`not_implemented` provider results; after this milestone, the exact
same `ResearchResult` shape, now carrying real sources/evidence for
three providers instead of zero. The contract is unchanged; only its
*content*, at runtime, changes.

---

# 10. Security Review

- **Real credential handling — the central security concern of this
  milestone.** `TAVILY_API_KEY`, `BRAVE_API_KEY`, and the new
  `CRUNCHBASE_API_KEY` are read exclusively via `process.env` (existing
  pattern, confirmed for the first two, applied identically to the
  third) — never hardcoded, never logged in full, matching `CLAUDE.md`
  Section 16 exactly. **No commit in this milestone ever contains a
  real key value** — `.env.local` is git-ignored (confirmed, unchanged)
  and the only change this milestone makes to it is adding one new,
  empty `CRUNCHBASE_API_KEY=` line (Deliverable 3); the real values for
  all three keys are supplied by the repository owner, locally, outside
  version control, at a time of their choosing — this design document
  itself never sees, requests, or records an actual key value.
- **No real secret ever reaches CI or an automated test.** Every new
  test (Deliverables 6–10) runs against a mocked `fetch` or no external
  call at all — confirmed by design (Section 7), not by policy alone.
  CI's existing placeholder-env-value strategy (`MILESTONE_30_DESIGN.md`
  Section 10) requires only the one new, inert placeholder line
  (Deliverable 4) already covered above — no behavioral change.
- **Secrets never appear in logs or error messages.** Brave/Tavily
  already enforce this (`safeUrlForLogging` strips query strings from
  any URL a produced error message might reference); the new
  Crunchbase provider must follow whichever of Brave's
  header-based or Tavily's body-based pattern matches its own real
  auth mechanism, with the same guarantee.
- **No new data-exposure surface.** Real sources flowing through an
  already-existing, already-rendered (`EvidenceList`/`TrustPanel`,
  confirmed by `MILESTONE_31_DESIGN.md`'s own audit) pipeline is a
  change in *content*, not in *what a founder can see about their own
  project* — no new field, no new route, no new access path.
- **No new abuse surface from Atlas AI's own users.** This milestone
  adds zero new routes and zero new user-facing input paths. The one
  new cost-relevant surface is real, metered third-party API usage
  (Tavily/Brave/Crunchbase's own rate limits and pricing) — already
  named as a general risk in `ATLAS_AI_V2_ROADMAP.md` Section 14; this
  design's own Risks section (12) makes it concrete for this
  milestone specifically.

---

# 11. Performance Review

- **Computational cost:** unchanged. `dedupeSources()`/`rankSources()`/
  `buildEvidence()` already operate on whatever-sized source list a
  provider set returns; this milestone changes that list's real size
  from (mostly) zero to some small, provider-capped number
  (`maxResults` ?? 5, per query, per provider) — no new algorithmic
  cost, no new loop shape.
- **Network cost — the one genuinely new performance dimension this
  milestone introduces.** Each of the three providers now makes a real,
  external HTTP call (8s internal timeout, up to 2 internal retries,
  plus `providerManager`'s own 10s outer ceiling) where today they
  return instantly (`not_configured`/`not_implemented` short-circuit
  before any network activity). A real analysis's total research-stage
  latency will measurably increase — from near-zero to, realistically,
  low seconds per configured provider (parallelized across independent
  providers per `searchViaProviderManager`'s own existing
  `Promise.all`, confirmed unchanged). This is an expected, necessary
  cost of real evidence existing at all, not a regression to guard
  against — named honestly rather than measured away.
- **No new caching need introduced by this milestone.** `cache/
  createCache()` already exists in this module (confirmed present,
  Section 5) and is untouched — wiring it into the research stage, if
  ever needed, is a separate, unnamed future optimization, not
  triggered by this milestone's own scope.

---

# 12. Risks

- **Crunchbase API access is, in current commercial reality, typically
  a paid product — a business dependency, not an engineering one.**
  Added per the Principal Architect Review (Finding 5, Section 17).
  Unlike Tavily and Brave, both of which offer a usable free tier
  (confirmed by this milestone's own ability to activate them with
  nothing more than a credential), Crunchbase's search API has
  historically required a commercial subscription to obtain a working
  `CRUNCHBASE_API_KEY` at all. This design does not confirm, and cannot
  confirm from inside the repository, whether the repository owner
  already holds or is willing to obtain such access. **This is
  explicitly a business/procurement dependency for Sub-milestone 32.2
  specifically, not a reflection on the engineering effort described in
  this document, and not something this design can resolve** — if paid
  access is not available when Sub-milestone 32.2 is reached, that
  sub-milestone is deferred independently (Section 15's dependency
  wording already allows for this) rather than blocking Sub-milestones
  32.1 or 32.3, both of which deliver real, independent value (Tavily/
  Brave activation; health testing and documentation correction)
  without requiring Crunchbase to be real first.
- **Crunchbase's real response shape is not yet confirmed against a
  live call at design time.** Named plainly (Section 3, Deliverable
  2): the field mapping in this design is a best-effort mapping to
  Crunchbase's public API documentation, not yet verified against a
  real response. Mitigated by the manual, real-credential verification
  step (Section 14) being a required, non-optional part of this
  milestone's own Acceptance Criteria — this milestone is not
  considered done on the strength of passing mocked tests alone.
- **Ranking factors remain placeholder (Section 5.2, Section 4).** Real
  evidence will flow in with zero real differentiation in rank order.
  Accepted, explicitly, as a separately-scoped, already-named future
  item — not a regression this milestone introduces, and not
  something this milestone's own success claims to fix.
- **Real API cost/rate-limit exposure.** Tavily, Brave, and Crunchbase
  each meter usage and may rate-limit or bill per request. Mitigated by
  (a) every automated test using a mocked `fetch`, never a real call
  (Section 7), and (b) the manual verification step (Section 14) being
  deliberately minimal — a small number of real analyses, not a load
  test.
- **A genuinely new source of test flakiness this milestone could
  introduce, if built carelessly: real-`fetch`-shaped mocks that drift
  from a real provider's actual response shape.** Mitigated the same
  way Milestone 30 mitigated Supabase mock drift (Section 16 of that
  design): the mock (`tests/mocks/fetchMock.ts`) is deliberately
  minimal and generic (it mocks `fetch` itself, a stable, versioned
  platform API, not a provider-specific SDK), so there is no
  provider-specific mock surface to drift — each provider test file
  supplies its own realistic *response body* fixture, reviewed against
  that provider's real, documented API shape at implementation time.
- **Silent scope pressure toward "real ranking" or "real judgment."**
  The same risk pattern `MILESTONE_31_DESIGN.md` named for
  recommendation generation applies here: once a founder sees real
  evidence, the natural next request is "now rank it well" or "now
  tell me what it means." Mitigated by naming both, explicitly, twice
  (Non-Goals, this section) as structurally separate, already-scoped
  future work (`ATLAS_AI_V2_ROADMAP.md` Phase 2, Milestone 33 onward,
  for judgment; an unnamed future milestone for ranking factors) — not
  something this milestone's own success should be allowed to quietly
  absorb.
- **Rollback.** Fully additive and narrowly corrective: one file
  rewritten (`crunchbaseProvider.ts`, same exported interface, same
  registry entry), five new test files (`httpRequest.test.ts`, and one
  each for Brave, Tavily, Crunchbase, and `computeHealth`), one new
  shared test helper, one new empty environment-variable line, one new
  inert CI placeholder line, two documentation corrections. Reverting
  the commit restores the prior (honestly stub) Crunchbase behavior and
  the prior (stale) documentation lines, with zero effect on any other
  module — Brave/Tavily's own real code is never touched by this
  milestone at all, so there is nothing to roll back in either of those
  two files.

---

# 13. Acceptance Criteria

1. [ ] `TAVILY_API_KEY` and `BRAVE_API_KEY` hold real values in the
   repository owner's own `.env.local` (verified locally; never
   committed, never inspected or recorded by this design or its
   implementer).
2. [ ] `lib/research/providers/crunchbaseProvider.ts` no longer calls
   `buildNotImplementedResult` — it makes a real HTTP call when
   `CRUNCHBASE_API_KEY` is set, and returns `"not_configured"`
   (unchanged shape) when it is not.
3. [ ] `.env.local` contains a new, empty `CRUNCHBASE_API_KEY=` line.
4. [ ] `.github/workflows/ci.yml` contains a new
   `CRUNCHBASE_API_KEY: "placeholder-not-a-real-key"` line, in the same
   location and format as the existing `BRAVE_API_KEY`/`TAVILY_API_KEY`
   lines (`git diff` shows exactly one added line in this file, no
   other line changed).
5. [ ] `lib/research/utils/httpRequest.test.ts` exists and passes,
   with each of the following as a separately named, separately passing
   test case: (a) a `429` response followed by a successful response
   resolves with the successful response; (b) a `500` response
   repeated across every attempt resolves with the final non-OK
   response after exactly `maxRetries` additional attempts, confirmed
   by asserting the mocked `fetch` was called `maxRetries + 1` times;
   (c) a `404` response resolves immediately with exactly one call to
   the mocked `fetch` recorded; (d) the delay between two consecutive
   retry attempts is asserted, via `vi.advanceTimersByTimeAsync()`, to
   double per attempt; (e) a call that never resolves before
   `timeoutMs` elapses (simulated via fake timers, not a real wait)
   rejects with a `RequestTimeoutError`.
6. [ ] `lib/research/providers/braveProvider.test.ts`,
   `tavilyProvider.test.ts`, and `crunchbaseProvider.test.ts` each
   exist and pass, each with the following distinct, separately named
   test cases: `not_configured` when the relevant API key is unset;
   an **empty-but-valid** response (`status: "ok"`, `sources: []`,
   zero results returned by the mocked API, none of them malformed);
   a **malformed** response, tested as two separate cases — an
   individually malformed result (missing a required field, skipped,
   the call still resolves `"ok"` with the remaining valid results) and
   an invalid response body (`response.json()` rejects, the call
   resolves `"error"`, not an unhandled rejection); a **transport
   failure**, tested as two separate cases — a non-OK HTTP status
   (`"error"`) and a simulated abort (`"timeout"` via
   `RequestTimeoutError`). Retry/backoff mechanics are not re-asserted
   in these three files — that is Criterion 5's responsibility.
7. [ ] `lib/research/manager/health.test.ts` exists and passes,
   covering `computeHealth()`'s optimistic-below-threshold case and
   both real failure-rate thresholds.
8. [ ] `tests/mocks/fetchMock.ts` exists and is imported by all three
   provider test files from Criterion 6 — no test file hand-rolls its
   own single-response `fetch` stub. (`httpRequest.test.ts` is exempt,
   per Section 7's own stated reason: it needs sequential, multi-call
   mock behavior `fetchMock.ts`'s helpers don't provide.)
9. [ ] **Manual, real-credential verification** (not automatable, named
   honestly per Section 5.4): a real analysis, run locally with real
   `TAVILY_API_KEY`/`BRAVE_API_KEY`/`CRUNCHBASE_API_KEY` values,
   produces a `DecisionProfile` whose `evidence` array contains at
   least one entry per configured provider, where each such entry's
   `source.url` resolves to a real, live URL returned by that
   provider's real API call (verified by opening the URL), not a
   placeholder or example value. (Crunchbase's own field mapping is
   confirmed or corrected at this same step, per Section 12's named
   risk — if Crunchbase paid API access is not available at this time,
   this criterion is satisfied for Tavily and Brave, and Crunchbase's
   own portion is deferred with Sub-milestone 32.2, per Section 12's
   business-dependency note.)
10. [ ] `lib/research/index.ts`'s header comment no longer contains the
    sentence "Nothing outside lib/research/ imports from this yet," and
    `RESEARCH_ENGINE.md`'s "Status" line no longer contains "not wired
    into the application" or the claim that `lib/analysis/`,
    `lib/services/`, `app/api/`, `lib/store/`, or `lib/schemas/` import
    nothing from `lib/research/`. Both instead name the six call sites
    listed in Section 5.3 (`lib/pipeline/stages/research.ts` and the
    five knowledge platforms' own discovery functions) as confirmed,
    current callers.
11. [ ] Zero automated test in this milestone's scope makes a real
    network call — confirmed by direct inspection of every new test
    file listed in Criteria 5–7, not assumed from
    `tests/mocks/fetchMock.ts`'s existence alone.
12. [ ] `tsc --noEmit`, `eslint`, and the full `vitest run` suite (new
    and pre-existing tests together) all pass with zero new errors.
13. [ ] `git diff --stat` confirms zero files changed under
    `lib/decision/`, `lib/business/`, `lib/market/`, `lib/financial/`,
    `lib/competitors/`, `lib/pipeline/`, `app/`, or `components/` — this
    milestone's changes are confined to `lib/research/`, `tests/`,
    `.env.local`, `.github/workflows/ci.yml`, and the two named
    documentation files.
14. [ ] Zero database changes — `git diff --stat` touches zero files
    under `supabase/migrations/`.
15. [ ] `ranking/factors.ts` is confirmed unmodified — this milestone
    does not, even incidentally, implement a real scoring factor.

---

# 14. Verification Plan

**Local automated verification:** `tsc --noEmit`, `eslint`, `npm run
test:coverage` (the five new test files must appear with real,
non-zero coverage for `utils/httpRequest.ts`,
`providers/braveProvider.ts`, `providers/tavilyProvider.ts`,
`providers/crunchbaseProvider.ts`, and `manager/health.ts` — all
previously at 0%, confirmed by this project's own coverage reporting
since Milestone 30), `next build` (confirming the new
`CRUNCHBASE_API_KEY` placeholder line in `.github/workflows/ci.yml`
doesn't change build behavior locally either).

**`fetchWithRetry` verification, in isolation, before any provider
depends on the result (mirrors this milestone's own Checkpoint-style
discipline for Milestone 33's Checkpoint A):** run
`lib/research/utils/httpRequest.test.ts` on its own and confirm every
case in Acceptance Criterion 5 passes using fake timers only — no test
run should take longer than a normal unit test simply because it's
exercising retry/backoff logic; if one does, real timers leaked into
the test and `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync()` are
not being used correctly.

**Manual, real-credential verification (this milestone's own,
honestly-named non-automatable step, per Section 5.4/12):** with real
values supplied locally for all three keys, run one real, complete
analysis end-to-end. Confirm: (a) Tavily and Brave each report `"ok"`
with a non-empty `sources` array in their own `ProviderResult`; (b)
Crunchbase reports either `"ok"` with real company-data sources, or a
genuine `"error"`/`"timeout"` that reveals a real mismatch between this
design's assumed response shape (Section 7) and Crunchbase's actual,
live response — in which case `normalizeResults()`'s field mapping is
corrected against the real response before this milestone is
considered done, not shipped against a guessed shape; (c) the
resulting `DecisionProfile`'s `evidence` field contains real,
non-fabricated entries traceable to real URLs; (d) `TrustPanel`/
`EvidenceList` (unchanged components, per `MILESTONE_31_DESIGN.md`'s
own audit) render this real evidence exactly as they already render
synthetic/empty evidence today — no visual regression, no new
component needed.

**Regression testing:** re-run the full existing test suite (95 tests
as of Milestone 31, per that design's own count) to confirm zero
existing test is broken by this milestone's changes — none should be,
since this milestone only rewrites one previously-stub file and adds
new files, but this is confirmed, not assumed.

**Edge cases, explicitly covered by the deliverables themselves, and
explicitly differentiated rather than lumped together:** a provider
with a missing key (`not_configured`, already covered by existing
logic, now tested for the first time) — distinct from **an empty-but-
valid response** (the provider made a real call and genuinely found
zero results: `status: "ok"`, `sources: []`) — distinct from **a
malformed response** (either one individually malformed result,
skipped without failing the call, or a response body that isn't valid
JSON at all, caught and mapped to `"error"`) — distinct from **a
transport failure** (a non-OK HTTP status, or a network-level timeout).
`computeHealth()`'s exact threshold boundaries are covered separately.
No edge case here is hypothetical — every one is a branch that already
exists in the real code (Brave/Tavily) or is being written to match
that exact, already-reviewed pattern (Crunchbase); the four-way
distinction itself (not_configured / empty / malformed / transport
failure) mirrors the four non-`"ok"`-or-populated states this
codebase's own `ProviderResultStatus` enum already exists to name.

**Failure-mode confirmation (matching `MILESTONE_30_DESIGN.md`'s own
"prove the gates actually gate" discipline):** confirm that a
deliberately-broken mock (an invalid-JSON response body) is caught by
each provider's own existing `try`/`catch` and produces `"error"`, not
an unhandled exception — proving the already-written error handling
actually works under test, not just by inspection. This case is a
named, required part of Acceptance Criterion 6 (Section 13), not only
a Verification Plan aspiration — the two sections are kept in
agreement here, correcting the inconsistency the Principal Architect
Review found (Finding 3, Section 17) between this section's prior
draft and the prior Acceptance Criteria/Deliverables.

---

# 15. Implementation Plan

**Sub-milestone 32.1 — Real Tavily & Brave activation, and their
first-ever tests**
- *Files:* `.env.local` (real values, owner-supplied, not committed),
  `lib/research/utils/httpRequest.test.ts`,
  `tests/mocks/fetchMock.ts`,
  `lib/research/providers/braveProvider.test.ts`,
  `lib/research/providers/tavilyProvider.test.ts`.
- *Outcome:* the shared retry/backoff/timeout mechanism both providers
  depend on is verified directly, in isolation, for the first time;
  the two already-real providers are credentialed, tested for the
  first time, and manually confirmed (partial — Tavily/Brave only) to
  produce real evidence end-to-end.
- *Dependencies:* none. `httpRequest.test.ts` is written first within
  this sub-milestone, before the two provider test files, so the
  shared mechanism they both build on is already confirmed correct by
  the time their own tests are written.

**Sub-milestone 32.2 — Real Crunchbase provider**
- *Files:* `lib/research/providers/crunchbaseProvider.ts` (rewritten),
  `lib/research/providers/crunchbaseProvider.test.ts`, `.env.local`
  (new empty `CRUNCHBASE_API_KEY=` line), `.github/workflows/ci.yml`
  (new `CRUNCHBASE_API_KEY` placeholder line).
- *Outcome:* the third, previously-stub provider becomes real,
  following the exact pattern Sub-milestone 32.1 confirmed still works
  correctly for its own two providers; its own manual verification
  (Section 14) either confirms or corrects the response-shape mapping
  against Crunchbase's real, live API.
- *Dependencies:* 32.1 (reuses `tests/mocks/fetchMock.ts` and the
  already-verified `fetchWithRetry`, and benefits from the pattern
  being freshly re-confirmed against a real provider before being
  applied to a from-scratch one). **Contingent on a business
  dependency outside this milestone's control** (Section 12, Finding
  5): real `CRUNCHBASE_API_KEY` access. If that access is not available
  when this sub-milestone is reached, it is deferred independently —
  it does not block 32.1 (already independent) or 32.3 (see below,
  whose own dependency has been loosened accordingly).

**Sub-milestone 32.3 — Health verification and documentation
correction**
- *Files:* `lib/research/manager/health.test.ts`,
  `lib/research/index.ts` (comment fix), `RESEARCH_ENGINE.md` (Status
  line fix).
- *Outcome:* this milestone's own "provider health monitoring"
  acceptance criterion is backed by a real, first-ever test rather than
  an inspectable log alone; both confirmed-stale "not wired" claims are
  corrected to reflect the reality Sections 5.1–5.3 establish.
- *Dependencies:* **loosened per the Principal Architect Review
  (Finding 9, Section 17)** — the documentation correction depends only
  on the six call sites named in Section 5.3 already being real, which
  they already are today, independent of this milestone entirely.
  `health.test.ts` has no code dependency on 32.1 or 32.2 either. This
  sub-milestone may therefore proceed in parallel with, or ahead of,
  32.2 specifically — it is no longer sequenced behind Crunchbase's own
  completion, so a deferral of 32.2 (per its own business-dependency
  risk above) does not block 32.3.

Each sub-milestone gets its own `tsc`/`eslint`/`vitest run` pass before
the next begins, per this project's established discipline
(`MILESTONE_31_DESIGN.md` Section 15 applied identically here).

---

# 16. Final Self Review

**Unnecessary complexity, directly challenged:** the one real design
decision — whether Crunchbase should share a new abstraction with
Brave/Tavily now that three providers exist — was examined and
rejected in Section 7, on the concrete grounds that this is only the
pattern's second repetition, one short of this project's own
three-repetition promotion threshold.

**Duplicated logic:** none found in the product code — Crunchbase's
implementation follows the same *shape* as Brave/Tavily by convention,
not by sharing code, matching how those two already relate to each
other today. In test code, one deliberate, welcomed duplication-
avoidance: `tests/mocks/fetchMock.ts` exists specifically so three
test files don't each hand-roll the same `vi.stubGlobal` boilerplate.

**Over-engineering, directly challenged:** should this milestone also
implement real ranking factors, since real sources are about to exist
for the first time? Rejected — `ranking/factors.ts`'s own doc comment
already scopes that as separate future work, and doing it here would
silently expand this milestone from "activate evidence" to "activate
evidence and make it well-ranked," a materially larger and differently
-risked unit of work the Roadmap does not assign to Milestone 32.
Should this milestone also add the other four unimplemented providers,
since the Crunchbase pattern is now fresh? Rejected — none is named by
`ATLAS_AI_V2_ROADMAP.md` for this milestone, and each is real,
separately-prioritizable work, not a "while we're in here" addition.

**Under-engineering, directly challenged:** is it acceptable that
`providerManager.ts` and `metrics.ts` remain completely untested after
this milestone, given they're exactly what makes real provider
activation *safe* (fallback, retry, health)? Considered and accepted
as a named, honest gap (Non-Goals, Section 4) — this milestone tests
exactly what it changes (three providers) plus the two functions its
own guarantees explicitly depend on: `computeHealth` (the health-
monitoring acceptance criterion) and, added per the Principal Architect
Review (Finding 1, Section 17), `fetchWithRetry` itself (the retry/
backoff/rate-limit mechanism every provider depends on, and which — the
review correctly found — no provider-level test alone actually
exercises). Testing the surrounding fallback-chain/metrics
orchestration machinery (`providerManager.ts`/`metrics.ts`) in full
remains real, valuable, separately-scoped work for a future milestone,
not silently implied to already be covered.

**Maintenance burden:** five new small test files plus one new shared
test helper — a small, honestly-bounded addition, proportionate to
three real, live, cost-incurring external integrations that previously
had zero automated verification of any kind.

**Architectural inconsistencies:** none found — this milestone
introduces zero new patterns (no new provider interface, no new
schema, no new test tier) and repeats exactly two already-established
ones (the Brave/Tavily provider shape, applied a third time; the
Milestone 30 mocked-dependency test pattern, applied to a new kind of
external dependency).

**Validation pass, performed as part of incorporating the Principal
Architect Review's findings:** re-reading the design in full after
every change above confirms none of them introduced anything this
project's Engineering Rules forbid by default. No new service
(`lib/services/`) was added — the new `httpRequest.test.ts` and CI line
are test/config artifacts, not application code. No new API route was
added. No new schema was added — `ProviderResultStatusSchema`'s
existing five-value enum already names every state these changes test.
No new persistence was added — `metrics.ts`'s existing in-memory `Map`
is untouched. No new abstraction was added — `tests/mocks/
fetchMock.ts` remains a single, thin wrapper around Vitest's own
built-in primitives, and `httpRequest.test.ts` reuses that same
primitive (`vi.stubGlobal`) directly rather than introducing a second,
competing mock mechanism (Section 7). Scope did not expand: every
change above is either a test proving an existing, already-relied-upon
mechanism actually works, a one-line CI/documentation consistency fix,
or a risk/dependency clarification — none adds a new capability, a new
provider, or a new product-facing behavior beyond what Section 2
already scoped.

**What this design deliberately does not claim.** It does not claim
Atlas AI now has "real market intelligence" or "well-ranked research."
It claims exactly what's true: three providers now make real HTTP
calls instead of two making real-but-unconfigured calls and one making
none at all, every one of the three has its first-ever automated test,
and the already-live pipeline between a provider and a founder's
`DecisionProfile` — proven, in this same audit, to already be wired
across all five knowledge platforms — carries that real evidence
through completely unmodified. Narrower than "the research engine is
done," stated plainly rather than oversold, matching this project's
consistent practice across every design so far.

---

# 17. Principal Architect Review — Resolution Log

A full, independent review of this design was performed treating it as
another team's work — every technical claim re-verified directly
against the repository (installed Vitest version and its type
definitions, `.env.local`'s actual key state via a value-blind
existence check, the existing CI workflow's current placeholder lines,
`isRetryableStatus`'s real 429 handling, and the complete absence of
any test file anywhere in `lib/research/`), not trusted from this
document's own prior draft. Findings and resolutions:

| # | Category | Finding | Resolution |
|---|---|---|---|
| 1 | Test strategy | `fetchWithRetry` — the one shared utility all three providers depend on for retry, exponential backoff, timeout, and 429/rate-limit handling — had no dedicated test, and no provider-level test (each mocking `fetch` to resolve/reject exactly once) actually exercises its real retry loop, real backoff delay, or real `AbortController`-driven timeout. The Provider Certification checklist's "Retry behaviour" and "Rate-limit handling" items were therefore unverified despite three provider test files existing. | Added `lib/research/utils/httpRequest.test.ts` as a new deliverable (Deliverable 6, Section 3), testing `fetchWithRetry` directly and in isolation with fake timers: 429-then-success, retry exhaustion on persistent 500, no retry on 404, doubling backoff delay, and a real timeout-triggered `AbortController` rejection. Added as Acceptance Criterion 5 and to the Verification Plan (Section 14). Section 7 explains explicitly why provider-level tests alone are insufficient for this. |
| 2 | Test strategy | No test case, in any provider's test plan, distinguished an empty-but-valid response (the provider genuinely found nothing) from a malformed one (a result was filtered out) — despite the Provider Certification checklist requiring "Empty-response handling" as its own item. | Added an explicit empty-but-valid-response case to each of the three provider test files (Deliverables 7–9, Section 3) and to Acceptance Criterion 6 (Section 13), stated as its own distinct case from the malformed-result case. |
| 3 | Documentation consistency | The Verification Plan (Section 14) committed to testing an invalid-JSON-response-body case ("a deliberately-broken mock... is correctly caught"), but this case never appeared in Section 3's Deliverables or Section 13's Acceptance Criteria — an internal inconsistency between what the design's own sections committed to. | Added the invalid-response-body case explicitly to each provider's test-case list (Deliverables 7–9) and to Acceptance Criterion 6, and reworded the Verification Plan's Failure-mode confirmation paragraph to cross-reference Acceptance Criterion 6 directly rather than stand alone as an unlinked aspiration. |
| 4 | CI consistency / Security | `.github/workflows/ci.yml` already places `BRAVE_API_KEY`/`TAVILY_API_KEY` placeholders, but this design never listed that file as touched, despite Deliverable 3 introducing a new `CRUNCHBASE_API_KEY` variable — inconsistent with the project's own established convention, even though the omission would not break the build (neither existing key uses a non-null assertion). | Added `.github/workflows/ci.yml` as a touched file (new Deliverable 4, Section 3), specifying the exact new placeholder line, added to Sub-milestone 32.2's file list (Section 15), and added as Acceptance Criterion 4 (Section 13). No real secret introduced; no behavioral change. |
| 5 | Business risk (not engineering) | Crunchbase's real API access is, in current commercial reality, typically a paid product — unlike Tavily/Brave, both of which have usable free tiers. This design assumed obtaining credentials was equivalent in cost/difficulty for all three providers, without naming the possibility that Sub-milestone 32.2 could be blocked by a procurement decision outside engineering's control. | Added explicitly to Risks (Section 12) as a named business dependency, distinct from every other, engineering-shaped risk in that section. Sub-milestone 32.2's own Dependencies note (Section 15) now states it may be deferred independently without blocking 32.1 or 32.3 if paid access isn't available when it's reached. Acceptance Criterion 9 (manual verification) was adjusted to allow partial satisfaction (Tavily/Brave only) if Crunchbase access is not yet available. |
| 6 | Acceptance criteria clarity | Acceptance Criterion 7 (manual verification) used the vague phrase "correctly-shaped data," when every `Source` is already guaranteed schema-valid by construction (`SourceSchema.safeParse` inside `normalizeResults`) — the criterion should have named a concrete, checkable outcome instead. | Rewritten as Acceptance Criterion 9 (Section 13): requires at least one `evidence` entry per configured provider whose `source.url` resolves to a real, live URL, verified by opening it — an objectively checkable outcome, with no instance of "correctly," "accurately," or "appropriately." |
| 7 | Acceptance criteria clarity | Acceptance Criterion 8 (documentation correction) used the qualitative phrase "accurately reflect" without naming the exact content expected to change. | Rewritten as Acceptance Criterion 10 (Section 13): names the exact sentence being removed from each file ("Nothing outside lib/research/ imports from this yet"; "not wired into the application") and the exact six call sites that must be named in its place. |
| 8 | Audit rigor (self-identified during this review, not raised by an external finding) | The original design's own audit confirmed `TAVILY_API_KEY`/`BRAVE_API_KEY` were empty in `.env.local` using `grep -o "^[A-Z_]*="`, a command that only captures the matched prefix and would have produced identical output whether or not a real value followed the `=` sign — the conclusion was correct, but the method used to reach it was not rigorous enough to have caught a false claim. | No change to the design's conclusion (re-verified independently this review with a value-blind existence check that does distinguish the two cases, and the original claim held). Noted here for the record, per this project's own standing practice of naming a real process gap rather than silently correcting it without comment. |
| 9 | Sequencing | Sub-milestone 32.3 (documentation correction) was stated to depend on 32.1–32.2 being "conceptually complete first," but the correction's actual truth condition — the six call sites in Section 5.3 already being real — has nothing to do with Crunchbase's implementation status. Given Finding 5's business dependency, this coupling risked blocking a documentation fix on a procurement decision. | Loosened in Section 15: 32.3's dependency is restated as depending only on the (already-true) fact established in Section 5.3, explicitly decoupling it from 32.2. |

**Explicitly confirmed, no change needed:**
- **Core technical claims:** Tavily/Brave real and fully-coded, Crunchbase a stub, `ranking/factors.ts` fully placeholder, and all six real callers of `runResearch()` — every one independently re-verified against the repository during this review, not one found to be inaccurate.
- **Architecture decisions:** not sharing a base abstraction across the three providers (only the pattern's second repetition, correctly below the three-repetition promotion threshold) and promoting `tests/mocks/fetchMock.ts` (used three times within this milestone alone) are both the threshold rule applied correctly, not selectively — re-confirmed under direct challenge.
- **Product scope:** no drift into Decision Intelligence, Ranking Intelligence, Recommendation Generation, or Execution Intelligence found anywhere in the design — every boundary in Section 4 (Non-Goals) held under re-inspection.
- **Security review:** credential handling, non-commitment of secrets, and CI's no-real-secret policy were all sound as designed; Finding 4 above is a consistency gap, not a security gap.
- **Vitest API availability:** `vi.stubGlobal`, `vi.unstubAllGlobals`, `vi.stubEnv`, and `vi.unstubAllEnvs` all confirmed present in the installed Vitest 4.1.10's own type definitions — the design's testing approach is technically executable as written.

No finding in this review reopened the milestone's scope boundary, added a new provider, added a new schema, or touched `ATLAS_AI_V2_FINAL.md`/`ATLAS_AI_V2_ROADMAP.md`. Every resolution above is either a new test proving an existing, relied-upon mechanism works, a one-line consistency fix, a risk/dependency clarification, or an acceptance-criterion wording tightening.

---

*End of design specification. Ready for implementation, pending
explicit approval to begin Sub-milestone 32.1. No code has been
written, no file modified beyond this design document.*
