# Atlas AI — Milestone 12 Design Specification

**Analysis Session: Exposing Pipeline Execution as a User-Facing Session**

Status: **Design only. No code, no folders, no source files exist yet.**
This document is the complete architecture and design specification for
Milestone 12, written for review before any implementation begins.
Nothing described here has been built.

Phase 1 (the six knowledge platforms) and Milestone 11 (the Execution
Pipeline, `lib/pipeline/`) are frozen. This milestone is additive and
must consume only `lib/pipeline/`'s public barrel — the same discipline
every prior milestone held itself to.

---

## 1. Purpose

Milestone 11 built the machinery `PRODUCT_BACKLOG.md`'s Priority 1
("Analysis Experience") asked for — real stage-by-stage progress,
cancellation, per-stage retry, resumability. But `PipelineExecution` is
an *engineering* record: its states (`retry_pending`, `stage_failed`,
`cancelling`), its bookkeeping (`attempt`, `trigger: "auto_retry"`), its
raw event stream (`stage.retry_scheduled`) are exactly right for
orchestration and exactly wrong to show a person. A founder watching
their idea get analyzed doesn't think in attempts and triggers — they
think "we're checking the market now" and want a timeline they can
glance at, a plain-language reason if something needs their attention,
and buttons that say "Cancel" and "Try again."

Milestone 12 exists to be that translation layer: it wraps one
`PipelineExecution` as an **Analysis Session** — a first-class,
user-facing record with a friendly lifecycle, a curated timeline, a
verbose log for anyone who wants the detail, and a stable API a future
dashboard can bind to directly. It adds no new domain knowledge and no
new orchestration logic; every fact a Session reports is read from the
Pipeline it wraps, never recomputed.

**Why it belongs after the Execution Pipeline, not earlier:** it needs
Milestone 11's state machine, event stream, and checkpointing to already
exist and be stable — Session doesn't reimplement retry, cancellation,
or resumption, it *calls* Pipeline's own functions and re-presents their
results. Building this layer before Milestone 11 existed would have
meant guessing at an API that didn't exist yet.

**What this milestone is not:** it is not the dashboard itself (no
React, no rendering — see Section 12, which is descriptive only), and it
is not a second orchestration engine. If a design decision in this
document starts to look like "reimplement part of what Pipeline already
does," that's a sign the boundary is wrong, not a sign to build it that
way.

---

## 2. Architectural Position

```
┌────────────────────────────────────────────────────────────────┐
│ Future Dashboard / UI                                              │
│  (not yet built — binds to Analysis Session's public API/events)     │
├────────────────────────────────────────────────────────────────┤
│ Milestone 12 — Analysis Session  (lib/analysis-session/, proposed)      │
│  Translates. Owns no orchestration logic of its own.                     │
├────────────────────────────────────────────────────────────────┤
│ Milestone 11 — Execution Pipeline  (lib/pipeline/)   — frozen              │
├────────────────────────────────────────────────────────────────┤
│ Decision / Business / Financial / Market / Competitor / Research  — frozen    │
└────────────────────────────────────────────────────────────────┘
```

Analysis Session sits directly above `lib/pipeline/` and directly below
any future UI. It is the second module in this codebase (after
`lib/pipeline/` itself) whose job is presentation-of-process rather than
either domain synthesis or raw orchestration. **No platform or the
Pipeline below this line may ever import from `lib/analysis-session/`** — the
same DAG-preserving rule verified for every layer so far.

---

## 3. Responsibilities

### Owns

- **Session lifecycle** — creating, cancelling, retrying, and resuming a
  session, each by delegating to Milestone 11's own
  `startPipeline`/`cancelPipeline`/`retryStage`/`resumePipeline`.
- **Session state projection** (Section 5) — a friendlier vocabulary
  mapped 1:1 from Pipeline's own state machine, never a reinterpretation
  of it.
- **The Timeline** (Section 6) — a curated, human-readable sequence of
  what happened, derived from the underlying `PipelineExecution`.
- **Logs** (Section 9) — a complete, verbose record of every attempt and
  transition, for anyone who wants more than the Timeline shows.
- **A friendlier progress presentation** (Section 7) — labels and
  framing layered on top of Pipeline's own `ProgressSnapshot`, never a
  second progress calculation.
- **The Session event stream** (Section 8) — a translated view of
  Pipeline's own events.
- **Its own, deliberately lightweight persistence** — a session's own
  metadata (title, the `executionId` it wraps), never a duplicate copy of
  what `PipelineExecution` already stores.

### Must never own

- **Any orchestration logic.** Retry policy, backoff, the state machine,
  checkpointing — all of it belongs to `lib/pipeline/` and is called, not
  reimplemented. If Session needs to know "is this stage retryable right
  now," it asks Pipeline; it does not maintain a parallel answer.
- **Any platform's domain logic.** Same rule Milestone 11 held: no
  research, no competitor discovery, no market classification, no
  financial estimation, no business synthesis, no decision synthesis.
- **The underlying `PipelineExecution` record.** Session reads it via
  `getExecution()`; it never stores a second copy of `context`,
  `stageHistory`, or `progress` — see Section 10's "derived, not
  duplicated" rule.
- **UI rendering.** No React, no Next.js request/response objects — the
  same framework-agnostic discipline every layer below it holds.

---

## 4. Session Lifecycle

A session's life, in plain terms:

1. **Created** — a user submits a startup idea; a Session is created
   wrapping a brand-new `PipelineExecution` (`createSession` calls
   `startPipeline` under the hood).
2. **Analyzing** — stages run, one at a time; the Timeline grows, the
   Logs grow, progress advances.
3. **Needs attention** *(if a stage exhausts its automatic retries)* — the
   session pauses, visibly, for a human decision: try again, or give up.
4. **Analyzing again** *(if the user retries)* — exactly the failed step
   resumes; nothing already completed is redone.
5. **Finished** — one of three ends: **Completed** (a `DecisionProfile`
   is ready), **Cancelled** (the user stopped it; whatever was learned
   before that point is kept), or **Failed** (something Session cannot
   recover from — bad input, or an internal bug).

A session wraps exactly **one** `PipelineExecution` for its entire life.
Retrying doesn't create a new execution — it calls `retryStage` on the
same one, exactly mirroring Pipeline's own "retry only the failed stage,
never restart from the top" rule. A genuinely new analysis is a new
Session, not a mutation of a finished one — the same "terminal states are
terminal" discipline Milestone 11 already established.

---

## 5. Session State Machine

A friendlier vocabulary, mapped 1:1 from Pipeline's own states — never a
reinterpretation, never a new state Pipeline doesn't already have an
answer for.

| Session state | Pipeline state(s) it projects | Meaning shown to a user |
|---|---|---|
| `starting` | `pending` | "Getting ready..." |
| `analyzing` | `running` | "Analyzing your idea..." (current stage name shown alongside) |
| `waiting_retry` | `retry_pending` | "Retrying..." (transient, auto-recovers) |
| `needs_attention` | `stage_failed` | "We hit a snag — try again?" |
| `cancelling` | `cancelling` | "Stopping..." |
| `completed` | `completed` | "Analysis complete" |
| `cancelled` | `cancelled` | "Cancelled" |
| `failed` | `failed` | "Something went wrong" |

The mapping is a pure function, `projectSessionState(pipelineState):
SessionState` — a lookup table, not a decision. If Pipeline ever adds a
new state, this table gains one new row; it never grows new logic.

---

## 6. Timeline Model

The Timeline is what a user actually watches — a short, curated list of
milestones, one entry per **stage transition**, not one per retry
attempt (a stage that auto-retried twice before succeeding still shows
as a single "Researching your idea..." → "Research complete" pair on the
Timeline; the retries are Logs' concern, Section 9).

```
TimelineEntry {
  id: string
  timestamp: string
  stage?: StageName            // absent for session-level entries (started/cancelled/completed)
  kind: "session_started" | "stage_started" | "stage_completed"
      | "stage_needs_attention" | "session_cancelled"
      | "session_completed" | "session_failed"
  label: string                 // fixed, templated copy — never generated text
}
```

`buildTimeline(execution: PipelineExecution): TimelineEntry[]` is a
**pure, real composition** over the execution's own `stageHistory` and
`state` — collapsing repeated failed/retried attempts at the same stage
into the single pair of entries a user should see (when a stage
succeeds, only the *first* attempt's start and the *succeeding* attempt's
completion become Timeline entries; intermediate failed attempts are
Logs-only). Labels are fixed, per-stage-per-kind template strings (e.g.
`"Researching your idea..."`, `"Found your competitors"`) — exactly the
same "real reshaping, never generated text" discipline
`lib/decision`'s `executive/executiveSummary.ts` already established.
No AI, no dynamic prose.

---

## 7. Progress Model

**No new math.** Session reads Pipeline's own `ProgressSnapshot`
(`completedStages`, `percent`, `estimatedRemainingMs`) via
`getExecution()` and re-presents it with a friendlier label — e.g.
`"Analyzing market (3 of 6)"` built from `completedStages` and the
current stage's name, and `"About 2 minutes remaining"` built from
`estimatedRemainingMs` only when Pipeline itself provides one (never a
guess invented at this layer — if Pipeline's own estimate is absent
because no stage has completed yet, Session shows no estimate either,
not a fabricated one).

---

## 8. Event Model

`SessionEvent` is a translated view of `PipelineEvent` — one Session
event per Pipeline event, same ordering (FIFO per session, inherited
from Pipeline's own per-execution FIFO guarantee), same
subscribe/unsubscribe shape (`subscribeToSession(sessionId, listener)`),
but in Session's own vocabulary:

```
SessionEvent {
  type: "session.started" | "timeline.updated" | "session.needs_attention"
      | "session.cancelling" | "session.cancelled" | "session.completed"
      | "session.failed"
  sessionId: string
  timestamp: string
  timelineEntry?: TimelineEntry   // present on timeline.updated
  message?: string                 // safe, human-readable — never a raw error
}
```

`timeline.updated` is the one event type with no direct Pipeline
equivalent — it fires whenever a new `TimelineEntry` is appended (i.e.
on every `stage.completed`/`stage.started`/terminal Pipeline event that
produces a new curated entry), carrying that entry so a subscribed
dashboard can append to its own rendered list without re-fetching the
whole session.

---

## 9. Logs

The verbose counterpart to the Timeline — every attempt, every
transition, every error message, timestamped, nothing collapsed:

```
LogEntry {
  timestamp: string
  level: "info" | "warn" | "error"
  message: string
  stage?: StageName
  attempt?: number
}
```

`buildLogs(execution: PipelineExecution): LogEntry[]` maps every
`StageRecord` (Milestone 11's own attempt-by-attempt history) into one
or more log lines — a `"running"`→`"succeeded"` pair becomes an `info`
line; a `"failed"` attempt becomes a `warn` line (or `error` if it
exhausted retries) carrying the real `errorMessage` Pipeline already
captured. Like the Timeline, this is a pure, derived view — no new
information is invented, only reformatted from what
`PipelineExecution.stageHistory` already honestly records.

---

## 10. Public API

```ts
createSession(input: { startupIdea: string; title?: string }): Promise<AnalysisSession>
getSession(sessionId: string): Promise<AnalysisSession | null>
listSessions(): Promise<AnalysisSession[]>
cancelSession(sessionId: string): Promise<AnalysisSession>
retrySession(sessionId: string): Promise<AnalysisSession>
resumeSession(sessionId: string): Promise<AnalysisSession>
subscribeToSession(sessionId: string, listener: SessionEventListener): () => void
```

**`AnalysisSession`** — the one thing every function above returns:

```ts
interface AnalysisSession {
  id: string;
  executionId: string;
  title: string;
  startupIdea: string;
  state: SessionState;           // Section 5
  progress: ProgressSnapshot;      // Pipeline's own, passed through unchanged
  timeline: TimelineEntry[];         // Section 6, derived
  createdAt: string;
  updatedAt: string;
  result?: DecisionProfile;          // present once state === "completed"
}
```

**Critical design rule: `AnalysisSession` is a derived, computed view,
not a stored record.** What Session actually persists (Section 11's
`storage/`) is a tiny metadata record — `{ id, executionId, title,
startupIdea, createdAt, updatedAt }`. Every read (`getSession`,
`listSessions`, the return value of every lifecycle call) composes the
full `AnalysisSession` on demand by calling `lib/pipeline`'s
`getExecution(executionId)` and running it through `projectSessionState`
+ `buildTimeline`. This is what keeps this layer honest: there is
exactly one source of truth for what happened (`PipelineExecution`), and
Session can never drift out of sync with it, because it never stores a
second copy. `getLogs(sessionId): Promise<LogEntry[]>` is a separate call
(not embedded in `AnalysisSession` itself) since most callers — most of
the time — want the Timeline, not the full verbose Logs; a dashboard
fetches Logs only when a user asks for the detail view.

---

## 11. Internal Modules

**Proposed folder structure** (not created by this document — for
review only):

```
lib/analysis-session/
├── lifecycle/     createSession/cancelSession/retrySession/resumeSession —
│                  each a thin delegation to lib/pipeline's own functions.
├── state/            projectSessionState() — the Section 5 lookup table.
├── timeline/       buildTimeline() — Section 6's curated, derived view.
├── logs/             buildLogs() — Section 9's verbose, derived view.
├── progress/       Friendly label formatting over Pipeline's own ProgressSnapshot.
├── events/           SessionEvent translation — subscribes to lib/pipeline's
│                  own event stream, re-emits in Session's vocabulary.
├── storage/        AnalysisSessionStore (the lightweight metadata record) +
│                  Memory (real) / Supabase / Postgres / Warehouse
│                  (architecture-only) + createStore(), the same four-
│                  backend pattern every prior platform used.
├── schemas/       Every Zod schema — one per shape, reused everywhere.
├── types/            Non-schema contracts (store interface, event listener).
└── utils/            An id generator, if the "pleasant deviation" Milestone
                     11 found (no list-shaped fields needing dedupe) holds
                     here too — to be confirmed once building, not assumed.
```

**Dependency direction:** `lifecycle/`, `timeline/`, `logs/`, `progress/`,
and `events/` all depend on `lib/pipeline`'s public barrel and on this
module's own `schemas/`/`types/`; `storage/` depends only on
`schemas/`/`types/`. Nothing here is depended on by `lib/pipeline/` or
anything beneath it.

---

## 12. Dashboard Integration

**Descriptive only — no UI is built by this milestone.** A future
dashboard page would: call `createSession()` when a user submits an
idea; call `subscribeToSession()` to receive live `timeline.updated`
events and append them to a rendered progress stepper, exactly answering
`PRODUCT_BACKLOG.md`'s "no progress timeline / no clear execution flow";
render a "Cancel" button wired to `cancelSession()` and a "Try again"
button (shown only when `state === "needs_attention"`) wired to
`retrySession()`, directly answering "cannot cancel analysis / cannot
restart a single stage"; and offer a "View details" disclosure that
lazily calls `getLogs()` only when opened. `listSessions()` is what a
future "Recent projects" dashboard card (`PRODUCT_BACKLOG.md` Priority 2
— Dashboard UX: "Recent projects should be clickable... Better history")
would page through. None of this is implemented here; it is recorded so
the Public API (Section 10) is shaped by how it will actually be
consumed, not designed in a vacuum.

---

## 13. Future Streaming Support

Session's event model (Section 8) is deliberately shaped so a real-time
transport is an additive subscriber, not a redesign — the same principle
Milestone 11 already established one layer down. Today,
`subscribeToSession` is in-process pub/sub; a future SSE/WebSocket layer
would sit between it and a browser, forwarding the same `SessionEvent`
shape over the wire instead of a direct function call. Not built in this
milestone — inherits Milestone 11's own "real-time updates" future
extension point one layer up.

---

## 14. Future Background Jobs

Today, `createSession()` still runs its underlying pipeline synchronously
within one call, inheriting Milestone 11's own scope limitation
(chunked, checkpointed execution within one process, not a
true always-running background worker). A future queue/worker system —
already named in Milestone 11's own Future Extension Points — would let
`createSession()` return immediately after creating the session and
enqueuing the work, with progress arriving entirely through
`subscribeToSession`/polling `getSession` rather than the initial call
blocking until completion. Session's API is already shaped to make that
change transparent to a caller (nothing about `createSession`'s
signature would need to change) — but building the worker system itself
is out of scope here.

---

## 15. Verification Strategy

Same bar as every prior milestone:

- `npx tsc --noEmit`, `npx eslint app components lib hooks`, `npm run
  build` — zero errors beyond the pre-existing `Testimonials.tsx` issue.
- A temporary scratch page, exercised against the running dev server and
  deleted before the final build, verifying: a full `createSession()`
  run reaching `completed` with a Timeline that has exactly one
  start/complete pair per stage; `projectSessionState` against every
  Pipeline state; `buildTimeline`/`buildLogs` against a hand-seeded
  execution with a retried stage (confirming the Timeline collapses the
  retry to one pair while Logs shows every attempt); `cancelSession`/
  `retrySession`/`resumeSession` each correctly delegating to Pipeline
  and reflecting the result; and the storage/factory pattern (memory
  default, architecture-only backends honestly throwing).

---

## 16. Definition of Done

1. `lib/analysis-session/` exists exactly per Section 11; every lifecycle
   function delegates to `lib/pipeline`'s public barrel and duplicates
   none of its logic (verified by grep, same technique
   `ARCHITECTURE_REVIEW.md` Check 1 used).
2. `AnalysisSession` is verified to be a derived, computed view — no
   test or code path stores a second copy of `context`/`stageHistory`/
   `progress`.
3. Section 5's state projection, Section 6's Timeline, and Section 9's
   Logs are all implemented and independently runtime-verified,
   including the retry-collapsing behavior Timeline specifically
   requires.
4. `tsc`/`eslint`/`build` all clean.
5. An `ANALYSIS_SESSION.md` (exact name confirmed at implementation
   time, avoiding any collision with existing docs the way
   `EXECUTION_PIPELINE.md` had to avoid the pre-existing `PIPELINE.md`)
   is written, matching the depth of every prior milestone's doc.
6. Scratch verification page created, every scenario in Section 15
   passes, deleted before the final build.
7. `git status` shows only `lib/analysis-session/` and its documentation as new —
   no frozen path touched.
8. Nothing committed until explicitly requested.

---

## 17. Risks

- **Derived-view staleness.** Because `AnalysisSession` is computed from
  `PipelineExecution` on every read, if the underlying execution is ever
  deleted independently of its session (no cascading delete exists
  between the two stores), `getSession()` would need a defined answer
  for "session exists, execution doesn't" — this document assumes that
  returns `null` (an orphaned session is not a valid session), but it's
  worth confirming at implementation time rather than assuming silently.
- **Two coupled lifecycles.** A session's lifecycle calls are direct
  delegations to Pipeline's own API — correct and intentional, but it
  means Session has zero ability to diverge from Pipeline's own
  semantics (e.g. Session cannot offer "pause" if Pipeline has no
  concept of pause). This is a feature, not a bug, but worth stating so
  a future request for session-only behavior Pipeline doesn't support is
  recognized as a Pipeline change, not a Session workaround.
- **Naming collision risk — resolved.** An earlier draft of this
  document proposed the terser `lib/session/`, which risked confusion
  with an authentication session once Milestone 4's real auth model
  (`CLAUDE.md` Roadmap) is built. Design review renamed the module to
  `lib/analysis-session/` specifically to close this off before any code
  exists — a future auth milestone is now free to use `lib/auth/` (or
  similar) for real user sessions without any naming ambiguity between
  the two concepts. No further action needed; recorded here so the
  reasoning behind the name isn't lost.
- **Utility duplication debt.** Whether this milestone needs its own
  `dedupeByKey`/`urlDedupeKey`-style copy (repeating
  `ARCHITECTURE_REVIEW.md` Technical Debt #1) or repeats Milestone 11's
  "pleasant deviation" (no list-shaped data needing dedupe) isn't known
  until `timeline/`/`logs/` are actually built — Timeline entries and
  Log entries are both flat lists built directly from `stageHistory`
  with no cross-list deduplication needed, so the working assumption is
  this milestone also needs none of those helpers; to be confirmed
  during implementation, not assumed.
- **No real streaming or background jobs yet** — both explicitly
  deferred (Sections 13, 14), inherited limitations from Milestone 11,
  not new ones this milestone introduces.

---

## 18. Sequence Diagram

```
Dashboard              Session Layer            Pipeline (M11)         Store(s)
   │                       │                        │                    │
   │  createSession(idea)  │                        │                    │
   ├──────────────────────▶│                        │                    │
   │                       │  startPipeline(idea)   │                    │
   │                       ├───────────────────────▶│                    │
   │                       │                        │ (runs 6 stages,     │
   │                       │                        │  checkpoints each) │
   │                       │◀───────────────────────│ PipelineExecution   │
   │                       │  persist session meta  │  (state: completed) │
   │                       │  { id, executionId, ... }                    │
   │                       ├───────────────────────────────────────────▶│
   │                       │  projectSessionState()                       │
   │                       │  buildTimeline()                              │
   │◀──────────────────────│ AnalysisSession (completed, timeline, result) │
   │                       │                        │                    │

  ── Live updates ──

   │  subscribeToSession(id)│                        │                    │
   ├──────────────────────▶│  subscribeToExecution(executionId)           │
   │                       ├───────────────────────▶│                    │
   │                       │◀───────────────────────│ PipelineEvent        │
   │◀──────────────────────│ SessionEvent (translated, timeline.updated)  │
   │                       │                        │                    │

  ── Needs attention → retry ──

   │                       │◀───────────────────────│ stage.failed         │
   │◀──────────────────────│ SessionEvent (needs_attention)                │
   │  retrySession(id)     │                        │                    │
   ├──────────────────────▶│  retryStage(executionId)                     │
   │                       ├───────────────────────▶│ (re-runs only the    │
   │                       │                        │  failed stage)      │
   │                       │◀───────────────────────│ PipelineExecution   │
   │◀──────────────────────│ AnalysisSession (analyzing again → completed) │

  ── Cancellation ──

   │  cancelSession(id)    │                        │                    │
   ├──────────────────────▶│  cancelPipeline(executionId)                 │
   │                       ├───────────────────────▶│ (cooperative,        │
   │                       │                        │  stage-boundary)    │
   │                       │◀───────────────────────│ PipelineExecution   │
   │◀──────────────────────│ AnalysisSession (cancelled, partial timeline) │
```

---

## 19. Milestone Plan

**12.1 — Schemas, types, and state projection.** `schemas/`
(`AnalysisSession`, `TimelineEntry`, `LogEntry`, `SessionEvent`),
`types/` (store interface, event listener type), and `state/`'s pure
`projectSessionState()` lookup table. No execution logic yet.

**12.2 — Timeline and Logs builders (pure, independently
verifiable).** `timeline/buildTimeline()` and `logs/buildLogs()`, both
pure functions over a `PipelineExecution` — testable directly against a
hand-built execution before any lifecycle wiring exists, exactly as
Milestone 11's `progress/`/`retry/` modules were independently
verifiable before its `engine/` existed.

**12.3 — Storage.** `storage/` (Memory — real — plus architecture-only
Supabase/Postgres/Warehouse, and `createStore()`), holding only the
lightweight session metadata record.

**12.4 — Lifecycle and events.** `lifecycle/`'s four delegating
functions plus `events/`'s Pipeline-event-to-SessionEvent translation —
this is where `createSession`/`getSession`/`listSessions`/
`cancelSession`/`retrySession`/`resumeSession`/`subscribeToSession`
actually get implemented, composing 12.1–12.3.

**12.5 — Documentation and full verification.** The platform doc
(Section 16, item 5), the scratch-page verification exercising every
scenario in Section 15, and the full `tsc`/`eslint`/`build` triad.

Each phase produces a working, typed, verifiable slice; 12.4 is the only
phase requiring all the others to already exist, sequenced last for
exactly that reason — the same shape Milestone 11's own plan followed.

---

## 20. Relationship to Execution Pipeline

Every section above already states this piecemeal; this table makes it
impossible to miss in one place. **Analysis Session is a
presentation-oriented layer built entirely on top of the Execution
Pipeline — it holds no truth of its own.**

| Concern | Execution Pipeline (`lib/pipeline/`) | Analysis Session (`lib/analysis-session/`) |
|---|---|---|
| **Source of truth** | **Yes.** `PipelineExecution` is the one authoritative record of what happened. | **No.** Holds no authoritative facts about execution — every fact it reports is read from Pipeline. |
| **Derived data** | Computes real, derived facts from its own data (`ProgressSnapshot`, retry counts) — but these derive from Pipeline's *own* history, not from another layer. | Everything it exposes is derived a second time, from Pipeline's already-derived data (`AnalysisSession`, `TimelineEntry[]`, `LogEntry[]` are all computed from `PipelineExecution` on every read — see Section 10). |
| **Ownership** | Owns orchestration: sequencing, retry policy, backoff, cancellation semantics, checkpointing. | Owns presentation: friendly state labels, curated narrative, verbose human-readable logs, dashboard-shaped API. Owns zero orchestration logic. |
| **Mutable vs. read-only state** | **Mutable, authoritative.** `startPipeline`/`resumePipeline`/`retryStage`/`cancelPipeline` are the only functions that ever change what actually happened, and the only writes to `PipelineExecution` occur here. | **Read-only against execution state.** Session's lifecycle calls (`cancelSession`, `retrySession`, `resumeSession`) *trigger* a Pipeline mutation by calling Pipeline's own functions — Session itself never mutates a `PipelineExecution` directly. The only thing Session actually writes is its own tiny metadata record (`id`, `executionId`, `title`, `startupIdea`). |
| **Progress** | Computes it (`computeProgress()` — Section 7 of `MILESTONE_11_DESIGN.md`): stage weighting, real observed durations, honest absence of an estimate. | Never recomputes it. Reads Pipeline's own `ProgressSnapshot` verbatim and adds a friendly label (Section 7 of this document) — the numbers themselves are Pipeline's, unchanged. |
| **Timeline** | Has no concept of a "Timeline" — only `stageHistory`, an engineering attempt log. | **Defines and owns this concept.** `buildTimeline()` is a pure, real transformation of Pipeline's `stageHistory` into a curated, retry-collapsed, human-readable sequence (Section 6). This exists *only* at the Session layer. |
| **Logs** | Has no user-facing "Logs" concept — `stageHistory` again, unformatted. | **Defines and owns this concept.** `buildLogs()` is a pure transformation of the same `stageHistory` into verbose, timestamped, leveled log lines (Section 9) — more detail than the Timeline, still nothing invented. |
| **Events** | Emits `PipelineEvent`s (`stage.started`, `stage.retry_scheduled`, ...) in its own engineering vocabulary (Section 11 of `MILESTONE_11_DESIGN.md`). | Subscribes to those events and re-emits `SessionEvent`s in a user-facing vocabulary (`timeline.updated`, `session.needs_attention`, ...) — a translation, never a second, independent event source. |

The pattern to notice: in every row, Execution Pipeline is where a fact
*becomes true*, and Analysis Session is where that same fact is
*reshaped for a person to read*. Nothing in this document gives Session
a single piece of authority Pipeline doesn't already have — which is
exactly what makes this an additive, boundary-respecting layer rather
than a second, competing orchestration engine.

---

*End of design specification. Awaiting review before any implementation
begins.*
