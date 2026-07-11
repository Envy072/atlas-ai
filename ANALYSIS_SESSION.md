# Atlas AI — Analysis Session

Milestone 12: the Analysis Session layer. This document describes
`lib/analysis-session/` — the presentation-oriented layer that sits
above the Execution Pipeline (`lib/pipeline/`) and exposes one pipeline
execution as a first-class, user-facing **Analysis Session**: a friendly
lifecycle, a curated timeline, a verbose log, and a stable API a future
dashboard can bind to directly. It implements the design specified and
approved in `MILESTONE_12_DESIGN.md` — that document is the
authoritative architectural rationale; this one documents what was
actually built and verified.

**Status: not wired into the application.** Nothing in `lib/analysis/`,
`lib/research/`, `lib/competitors/`, `lib/market/`, `lib/financial/`,
`lib/business/`, `lib/decision/`, `lib/pipeline/`, `lib/store/`,
`app/api/`, or `lib/schemas/` imports from `lib/analysis-session/` —
every one of those paths is frozen and remains completely unchanged.
`lib/analysis-session/` is free-standing, and consumes exactly one
thing from outside itself: `lib/pipeline`'s public barrel
(`startPipeline`, `resumePipeline`, `retryStage`, `cancelPipeline`,
`getExecution`, `subscribeToExecution`, plus `PipelineExecution`,
`ProgressSnapshot`, `StageName`, `PipelineState`, `TOTAL_STAGES`, and
`PipelineContext` — all imported directly from `"@/lib/pipeline"`,
never a deep path).

---

## Why This Exists

`PipelineExecution` is an engineering record — its states
(`retry_pending`, `stage_failed`), its bookkeeping (`attempt`,
`trigger: "auto_retry"`), and its raw event stream
(`stage.retry_scheduled`) are exactly right for orchestration and
exactly wrong to show a person. This milestone wraps one
`PipelineExecution` as an **Analysis Session** — friendlier states, a
curated Timeline, verbose Logs for anyone who wants the detail — adding
no new domain knowledge and no new orchestration logic. Every fact a
Session reports is read from the Pipeline it wraps, never recomputed.

---

## Architecture

Ten folders, exactly as specified in `MILESTONE_12_DESIGN.md` Section
11 (with the module renamed from the design's first draft, `lib/session/`,
to `lib/analysis-session/` during design review, specifically to avoid
any future collision with an authentication session):

```
lib/analysis-session/
├── lifecycle/     createSession/getSession/listSessions/cancelSession/
│                  retrySession/resumeSession/getLogs — each delegating
│                  to lib/pipeline's own functions, plus the composer
│                  that derives a full AnalysisSession on every read.
├── state/            projectSessionState() — the Section 5 lookup table.
├── timeline/       buildTimeline() — Section 6's curated, retry-collapsed view.
├── logs/             buildLogs() — Section 9's verbose, per-attempt view.
├── progress/       formatProgress() — a friendly label over Pipeline's
│                  own ProgressSnapshot; no new math.
├── events/           subscribeToSession() — translates PipelineEvent into
│                  SessionEvent.
├── storage/        AnalysisSessionStore (the lightweight SessionRecord) +
│                  Memory (real) / Supabase / Postgres / Warehouse
│                  (architecture-only) + createStore(), plus one shared
│                  defaultAnalysisSessionStore singleton every module
│                  that needs a default falls back to.
├── schemas/       Every Zod schema — one per shape, reused everywhere.
├── types/            Non-schema contracts (store interface, event listener).
└── utils/            Two id generators (session ids, timeline entry ids).
```

**Dependency direction:** `lifecycle/`, `timeline/`, `logs/`,
`progress/`, and `events/` all depend on `lib/pipeline`'s public barrel
and this module's own `schemas/`/`types/`; `storage/` depends only on
`schemas/`/`types/`. Confirmed by grep: zero deep imports into
`lib/pipeline`'s internals anywhere in `lib/analysis-session/`, and
nothing in `lib/pipeline` or below imports from this module.

---

## Relationship to Execution Pipeline

`MILESTONE_12_DESIGN.md` Section 20 states the intended relationship
precisely, and the implementation holds it exactly: **Analysis Session
is a presentation-oriented layer built entirely on top of the Execution
Pipeline — it holds no source of truth of its own.** Concretely:

- Session's own persisted record (`SessionRecord`) has five fields —
  `id`, `executionId`, `title`, `startupIdea`, timestamps. That is the
  entirety of what this layer writes.
- Every other fact — `state`, `progress`, `timeline`, `result` — is
  computed fresh on every `getSession()`/`listSessions()`/lifecycle
  call, by `lifecycle/sessionComposer.ts`'s `composeAnalysisSession()`,
  from `PipelineExecution` fetched via `getExecution()`. There is no
  code path anywhere in this module that stores `context`,
  `stageHistory`, or `progress` a second time.
- `cancelSession`/`retrySession`/`resumeSession` contain **zero
  conditional logic of their own** — each is a direct, unconditional
  call to `cancelPipeline`/`retryStage`/`resumePipeline`, followed by
  re-composing the result. Verified live: calling each against an
  already-completed session correctly reproduces Pipeline's own
  terminal-state behavior (a no-op for cancel/resume, a thrown
  `InvalidRequestError` for retry) — proof that Session never
  intercepts or reinterprets what Pipeline decides.

---

## Session Lifecycle & State Machine

`state/projectSessionState.ts` implements Section 5's table exactly — a
pure `Record<PipelineState, SessionState>` lookup, verified live against
all eight Pipeline states in one pass (`pending → starting`,
`running → analyzing`, `retry_pending → waiting_retry`,
`stage_failed → needs_attention`, `cancelling → cancelling`,
`completed/cancelled/failed` unchanged). A session wraps exactly one
`PipelineExecution` for its entire life — `retrySession` re-invokes
`retryStage` on the *same* `executionId`, never creating a new
execution, mirroring Pipeline's own "retry only the failed stage" rule.

---

## Timeline Model

`timeline/buildTimeline.ts`'s `buildTimeline()` is real, derived
composition over `stageHistory` — never generated text (every label is
fixed, per-stage-per-kind template copy). `STAGE_ORDER` is derived from
`StageNameSchema.options` (Pipeline's own public enum, in its own
declared order) rather than a second, hand-maintained array that could
drift.

**The collapsing behavior is the core of this model, and it's verified
live:** a hand-seeded stage that failed twice before succeeding on its
third attempt produces exactly **two** Timeline entries for that stage
(`stage_started`, `stage_completed`) — the two failed attempts never
appear. `stage_needs_attention` appears only once automatic retries are
exhausted (`state === "stage_failed"`); a stage still auto-retrying
(`retry_pending`) shows only its `stage_started` entry so far, since it
hasn't asked the user for anything yet.

---

## Logs

`logs/buildLogs.ts`'s `buildLogs()` is the verbose counterpart — every
attempt, nothing collapsed. Verified live: the same hand-seeded
twice-failed-then-succeeded stage produces **six** log lines (three
"started" lines, two "warn"-level failure lines, one "info"-level
success line) against the Timeline's two entries for that stage — the
concrete proof that Timeline and Logs are genuinely different views of
the same underlying data, not the same list under two names. A failed
attempt's level is `"warn"` if more attempts follow, `"error"` if it's
the last attempt recorded for that stage so far — verified live against
a hand-seeded execution that exhausted its retries.

---

## Progress Model

`progress/formatProgress.ts` performs **no new math** — it reads
Pipeline's own `ProgressSnapshot` (`completedStages`, `percent`,
`estimatedRemainingMs`) and formats a label
(`"Analyzing the market (3 of 6) — about 45s remaining"`). Verified
live: when Pipeline provides no time estimate (nothing has completed
yet), the formatted label correctly omits one entirely rather than
fabricating a guess.

---

## Event Model

`events/sessionEventEmitter.ts`'s `subscribeToSession()` wraps
`subscribeToExecution()` and translates each `PipelineEvent` into a
`SessionEvent` in Session's own vocabulary: five Pipeline event types
map directly (`pipeline.started → session.started`, etc.); `stage.failed`
becomes `session.needs_attention` only once retries are exhausted;
`stage.started`/`stage.completed` become `timeline.updated`, carrying
the newly-appended `TimelineEntry`; `stage.retry_scheduled` intentionally
produces no `SessionEvent` at all — that detail lives in Logs only,
exactly mirroring the Timeline's own collapsing rule.

`subscribeToSession()` looks up a session's `executionId` asynchronously
but returns its unsubscribe function synchronously (matching the design's
public API shape) via an eager-unsubscribe guard — calling the returned
function before the async lookup resolves correctly prevents the
underlying Pipeline subscription from ever being established. Verified
live: the function returns a callable unsubscribe with no error.

---

## A Bug Caught Before It Shipped

While wiring `lifecycle/sessionLifecycle.ts` and
`events/sessionEventEmitter.ts` together, each module's first draft
called `lib/analysis-session/storage/createStore()` independently to
obtain its own "default store." Because `createStore()`'s `"memory"`
backend constructs a **brand-new** `MemoryAnalysisSessionStore` (a fresh,
empty `Map`) on every call, two independent calls would have produced
two stores that silently disagreed about which sessions exist — a
session created via `createSession()` would have been invisible to
`subscribeToSession()`'s own lookup, with no error, just a session that
silently failed to be found.

Fixed by extracting one module-level singleton,
`storage/defaultStore.ts`'s `defaultAnalysisSessionStore`, that every
module needing a default now imports — never calling `createStore()`
directly for that purpose. This is exactly the kind of cross-module
shared-state bug that's easy to introduce when several files each
reach for "the same" default independently; see Lessons Learned in the
completion report for why it's worth naming explicitly.

---

## Storage

`types/storage.ts`'s `AnalysisSessionStore` (`getById`, `list`, `upsert`,
`delete`) mirrors every prior platform's own store interface, storing
only `SessionRecord` — never a duplicate of `PipelineExecution`.
`MemoryAnalysisSessionStore` is real; `SupabaseAnalysisSessionStore`,
`PostgresAnalysisSessionStore`, and
`KnowledgeWarehouseAnalysisSessionStore` (the last adding one
warehouse-specific `countSessionsCreatedBetween()` method) are
architecture-only and honestly throw. Verified live: the default backend
is memory, and the Supabase backend throws rather than silently
no-op-ing.

---

## Runtime Verification

Exercised live via a temporary scratch route
(`app/analysis-session-sanity-check/page.tsx`) against the running dev
server, then deleted before the final build. **Every check passed**
(three initial test-assertion errors were caught and fixed during
verification — the implementation was correct in every case; the
scratch page's own hand-written expectations needed correcting, not the
`buildTimeline`/`buildLogs` logic itself), including:

- `projectSessionState` against all eight Pipeline states in one pass.
- `buildTimeline`'s retry-collapsing behavior (two entries for a
  twice-failed-then-succeeded stage) and its `stage_needs_attention`
  surfacing only once retries are exhausted.
- `buildLogs`'s full six-line verbosity for the same stage, and its
  correct `warn`-vs-`error` level assignment.
- `formatProgress`'s label formatting, including honestly omitting a
  time estimate when Pipeline provides none.
- Storage defaults and the architecture-only backends' honest failure.
- **A full, real, end-to-end session** — `createSession()` driving a
  real `startPipeline()` run across all six platforms, reaching
  `completed` with a 14-entry Timeline; `getSession()` recomposing the
  identical view fresh; `getSession()` on an unknown id returning `null`
  (never a partial view); `listSessions()` including it;
  `getLogs()` returning a real, structurally consistent log.
- `cancelSession`/`retrySession`/`resumeSession`'s faithful delegation
  against that real, already-completed session — proving no
  Session-specific branching intercepts Pipeline's own decisions.
- `subscribeToSession()`'s basic subscribe/unsubscribe mechanics.

**Not verified:** a live, in-flight event race (subscribing to a session
*while* its pipeline is still mid-stage and observing `timeline.updated`
events arrive in real time) — the same reasoning
`EXECUTION_PIPELINE.md` already documented: a run that completes
quickly in an environment with no configured search providers makes
timing-based event-race tests flaky rather than meaningful. The
underlying translation logic was verified directly via code review and
the hand-seeded Timeline/Logs tests, which exercise the identical
`buildTimeline()`/state-comparison logic `subscribeToSession()` calls
internally.

---

## Definition of Done — Verified

Every item in `MILESTONE_12_DESIGN.md` Section 16 is satisfied: the
folder structure matches Section 11 exactly (module named
`lib/analysis-session/`, per the design review's rename); zero deep
imports (grep-verified); `AnalysisSession` is confirmed derived, not
duplicated (no code path stores a second copy of Pipeline's own data);
the state projection, Timeline, and Logs are all implemented and
independently runtime-verified, including the retry-collapsing
behavior; `tsc`/`eslint`/`build` are all clean; this document matches
the depth of `EXECUTION_PIPELINE.md` and every prior platform doc; the
scratch verification page was deleted before the final build; and no
frozen path was touched.

---

## Risks Carried Forward From the Design (Now Confirmed or Resolved)

- **Derived-view staleness** — confirmed handled: `getSession()`
  correctly returns `null` for a session whose underlying execution
  can't be found, rather than a partially-composed view.
- **Two coupled lifecycles** — confirmed by construction:
  `cancelSession`/`retrySession`/`resumeSession` contain no branching of
  their own; every decision Pipeline makes passes through unchanged.
- **Naming collision risk** — resolved during design review
  (`lib/session/` → `lib/analysis-session/`), documented in
  `MILESTONE_12_DESIGN.md`'s own Risks section as no longer open.
- **Utility duplication debt** — confirmed *not* repeated here, the same
  way Milestone 11 avoided it: Timeline and Log entries are both flat
  lists built directly from `stageHistory` with no cross-list
  deduplication needed, so this module needed no
  `dedupeByKey`/`urlDedupeKey`-style helper at all.
- **No real streaming or background jobs yet** — both explicitly
  deferred (Sections 13, 14 of the design), inherited from Milestone 11,
  not new limitations this milestone introduces.

---

## Future Extension Points

Unchanged from `MILESTONE_12_DESIGN.md` Sections 13–14 — real-time
push (SSE/WebSocket) of `SessionEvent`s instead of polling, and a
background-job/queue system so `createSession()` can return immediately
rather than blocking until the underlying pipeline completes. Both
inherit directly from `lib/pipeline`'s own equivalent future extension
points; nothing in this implementation forecloses either.
