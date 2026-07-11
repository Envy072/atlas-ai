# Atlas AI — Milestone 11 Design Specification

**Execution Pipeline: The Orchestration Layer**

Status: **Design only. No code, no folders, no source files exist yet.**
This document is the complete architecture and design specification for
Milestone 11, written for review and approval before any implementation
begins. Nothing described here has been built.

Phase 1 is frozen. This milestone is additive and must consume only the
public barrels of `lib/research/`, `lib/competitors/`, `lib/market/`,
`lib/financial/`, `lib/business/`, and `lib/decision/` — the same
discipline every Phase 1 platform held itself to, verified in
`ARCHITECTURE_REVIEW.md`.

---

## 1. Purpose

Every Phase 1 platform is independently excellent and independently
opaque. `synthesizeDecision()` — the single entry point that already
chains Research → Competitors → Market → Financial → Business → Decision
— is one atomic `async` call. A caller gets nothing until it resolves:
no stage visibility, no partial results, no way to cancel, no way to
retry just the piece that failed, nothing to resume if the browser tab
closes mid-run.

This is precisely the gap `PRODUCT_BACKLOG.md`'s highest-priority section
(**Priority 1 — Analysis Experience**) names from real user testing:

> Cannot see the current analysis stage. Cannot see how much analysis
> remains. No progress timeline. Cannot cancel analysis. Cannot restart
> a single stage. No clear execution flow.

Milestone 11 exists to close exactly this gap — and only this gap. It
does not add new domain knowledge, new scoring, new evidence, or new
business logic. It wraps the six existing platforms in an **execution
runtime**: something that runs them as a sequence of observable,
retryable, cancellable, resumable steps instead of one opaque call, and
exposes that runtime through a stable event stream a future UI can
subscribe to.

**Why it belongs after Decision Intelligence, not earlier:** it needs
every layer it orchestrates to already exist, be stable, and be frozen —
it is purely a consumer, with zero domain logic of its own. Building it
earlier would have meant orchestrating an incomplete stack; building it
now means orchestrating six platforms whose public contracts (verified
in `ARCHITECTURE_REVIEW.md`) are already proven consistent and safe to
depend on.

**What this milestone is not:** it is not the Startup Builder from the
backlog's Priority 1 section (Idea → Research → Analysis → Decision →
Execution Plan → Weekly Tasks → Validation → MVP → Launch). This
milestone only orchestrates the **Idea → Decision** portion that already
exists. The Execution Plan / Weekly Tasks / Validation / MVP / Launch
stages are new domain platforms for a later milestone, not something
Milestone 11 invents. Getting the orchestration runtime right first is
what makes adding those later stages a matter of appending new stages to
an existing pipeline, not redesigning the pipeline itself.

---

## 2. Architectural Position

```
┌──────────────────────────────────────────────────────────────┐
│ Future UI / Dashboard                                          │
│  (not yet built — subscribes to Milestone 11's public API/events) │
├──────────────────────────────────────────────────────────────┤
│ Milestone 11 — Execution Pipeline  (lib/pipeline/, proposed)      │
│  Orchestrates. Owns no domain knowledge.                          │
├──────────────────────────────────────────────────────────────┤
│ Decision Intelligence      (lib/decision/)    — frozen               │
├──────────────────────────────────────────────────────────────┤
│ Business Intelligence      (lib/business/)    — frozen               │
├──────────────────────────────────────────────────────────────┤
│ Financial Intelligence      (lib/financial/)   — frozen               │
├──────────────────────────────────────────────────────────────┤
│ Market Intelligence           (lib/market/)      — frozen               │
├──────────────────────────────────────────────────────────────┤
│ Competitor Intelligence     (lib/competitors/) — frozen               │
├──────────────────────────────────────────────────────────────┤
│ Research Engine                 (lib/research/)    — frozen               │
└──────────────────────────────────────────────────────────────┘
```

Milestone 11 sits **above** all six platforms and **below** any future
UI. It is the first module in this codebase whose entire job is
*sequencing and observing* calls into other modules, rather than
*synthesizing knowledge*. Every one of the six platforms below it
already independently calls everything beneath itself (Business calls
Financial+Market+Competitors+Research; Decision calls all five) — this
milestone does not change that. It adds a seventh, outermost layer that
drives those same six public entry points one at a time, for the purpose
of observability, not knowledge synthesis.

**No platform below this line may ever import from `lib/pipeline/`.**
That would invert the dependency graph `ARCHITECTURE_REVIEW.md` Check 1
verified as a clean DAG. Milestone 11 only ever imports downward.

---

## 3. Responsibilities

### Owns

- Sequencing the six platforms' own public entry points as **stages**.
- The execution **state machine** (Section 6) for one "run" of the
  pipeline against one startup idea.
- **Progress** calculation and estimated-remaining-time (Section 7).
- **Retry** policy — automatic and manual, per stage (Section 8).
- **Cancellation** semantics (Section 9).
- **Checkpointing** and **resume** (Section 10).
- The **event stream** a future UI subscribes to (Section 11).
- Mapping every failure into a safe, typed, user-visible error (Section
  12).
- Its own persistence: an execution/checkpoint record, not the
  underlying knowledge profiles.

### Must never own

- **Any domain logic already owned by a platform.** It must never
  perform research, discover competitors, classify a market, estimate a
  financial metric, derive business strategy, or synthesize a decision
  itself. Every one of those six verbs already has an owner; Milestone
  11 calls that owner's public function and nothing else.
- **The knowledge platforms' own storage.** `MemoryCompetitorStore`,
  `MemoryMarketStore`, etc. are Phase 1's concern. Milestone 11
  persists only its own execution/checkpoint state — it does not
  reach into, wrap, or duplicate any platform's `createStore()`.
- **UI concerns.** No React, no Next.js request/response objects, no
  rendering. Exactly the same "framework-agnostic" discipline every
  Phase 1 platform held itself to (verified: zero `"use client"`, zero
  `next/`, zero `react` imports anywhere in `lib/research` through
  `lib/decision`).
- **Deep imports into any platform's internals.** Every stage calls
  exactly one function from exactly one platform's public barrel
  (`runResearch`, `discoverCompetitors`, `discoverMarket`,
  `discoverFinancials`, `discoverBusiness`, `synthesizeDecision`) —
  never a deep path, never an internal helper.

---

## 4. Public API

Proposed shape (names illustrative; finalized at implementation time).

**Entry points**

```ts
startPipeline(input: { startupIdea: string }): Promise<PipelineExecution>
resumePipeline(executionId: string): Promise<PipelineExecution>
retryStage(executionId: string): Promise<PipelineExecution>      // retries the currently-failed stage only
cancelPipeline(executionId: string): Promise<PipelineExecution>
getExecution(executionId: string): Promise<PipelineExecution | null>
subscribeToExecution(executionId: string, listener: PipelineEventListener): () => void
```

**Inputs**

- `startPipeline`: a startup idea string (validated the same way every
  platform's own `*DiscoveryRequestSchema` validates it — non-empty,
  `parseOrThrow`).
- `resumePipeline` / `retryStage` / `cancelPipeline` / `getExecution`:
  an `executionId` — the checkpoint record's own id, nothing else.

**Outputs**

- `PipelineExecution` — the full execution record: id, current state
  (Section 6), current stage index, every stage's captured result (or
  failure) so far, progress percentage, retry counts, timestamps, and —
  once the Decision stage succeeds — the final `DecisionProfile`.
- Every mutating call (`startPipeline`, `resumePipeline`, `retryStage`,
  `cancelPipeline`) returns the same `PipelineExecution` shape, so a
  caller never needs a second call just to see what changed.

**Events**

See Section 11 — `subscribeToExecution` is the live-update path;
`getExecution` is the poll/one-shot path. Both read from the same
underlying checkpoint, so a client that missed events (e.g. a page that
was closed) can always reconstruct current state via `getExecution`
alone.

---

## 5. Pipeline Stages

Six stages, each wrapping exactly one platform's own public entry point.
Every stage receives the **same** `{ startupIdea }` input — no stage
receives another stage's output as an input parameter, because none of
the six platforms' own `discover*`/`synthesize*` functions accept
pre-fetched context (see Section 18, Risk: Redundant Recompute). This is
a deliberate, documented consequence of Phase 1's architecture, not an
oversight in this design.

| # | Stage | Calls | Input | Output captured | Failure behavior |
|---|---|---|---|---|---|
| 1 | Research | `runResearch({ topic: startupIdea })` (`lib/research`) | `startupIdea` | `ResearchResult` | Auto-retry per Section 8; if exhausted, pipeline enters `stage_failed` — no later stage starts |
| 2 | Competitors | `discoverCompetitors({ startupIdea })` (`lib/competitors`) | `startupIdea` | `CompetitorDiscoveryResult` | Same as above |
| 3 | Market | `discoverMarket({ startupIdea })` (`lib/market`) | `startupIdea` | `MarketDiscoveryResult` | Same as above |
| 4 | Financial | `discoverFinancials({ startupIdea })` (`lib/financial`) | `startupIdea` | `FinancialDiscoveryResult` | Same as above |
| 5 | Business | `discoverBusiness({ startupIdea })` (`lib/business`) | `startupIdea` | `BusinessDiscoveryResult` | Same as above |
| 6 | Decision | `synthesizeDecision({ startupIdea })` (`lib/decision`) | `startupIdea` | `DecisionSynthesisResult` — this is the pipeline's final result | Same as above; success here is the only way to reach `completed` |

**Dependencies:** purely sequential — stage *N* does not begin until
stage *N-1* has succeeded. This is the deliberate observability-over-
throughput tradeoff named in Section 18. Stages do not share data with
each other through the pipeline; each is independently self-sufficient
by construction (this is exactly how Phase 1 already built them).

**Failure behavior, precisely:** a stage failing does not roll back
earlier stages. Earlier stages' captured results remain part of the
`PipelineExecution` record and are shown to the user regardless of what
happens later — this is what makes "partial results" meaningful for
cancellation (Section 9) and for a stage failing partway through
(Section 8).

---

## 6. State Machine

### States

| State | Terminal? | Meaning |
|---|---|---|
| `pending` | No | Execution created, no stage has started yet |
| `running` | No | A stage is currently executing |
| `retry_pending` | No (recovery) | A stage failed; an automatic retry is scheduled |
| `stage_failed` | No (recovery) | A stage exhausted automatic retries; awaiting manual retry or cancellation |
| `cancelling` | No | Cancellation requested; the in-flight stage is finishing cooperatively (Section 9) |
| `resuming` | No (recovery) | Execution loaded from a checkpoint after interruption; re-validating where it left off before returning to `running` |
| `completed` | **Yes** | Stage 6 (Decision) succeeded; final `DecisionProfile` available |
| `cancelled` | **Yes** | User cancelled; partial results retained, no further stages will run |
| `failed` | **Yes** | A fatal, non-retryable error (bad input, or an internal invariant violation) — reserved for errors retrying cannot fix |

### Transitions

```
pending        --start-->              running
pending        --invalid input-->      failed

running        --stage succeeds, more stages remain-->   running (next stage)
running        --stage succeeds, was stage 6-->          completed
running        --stage throws, retries remain-->         retry_pending
running        --stage throws, retries exhausted-->       stage_failed
running        --cancel requested-->                       cancelling

retry_pending  --backoff elapses-->                        running (same stage, retried)

stage_failed   --manual retry-->                           running (same stage, retried)
stage_failed   --cancel-->                                   cancelled

cancelling     --in-flight stage settles-->                  cancelled

resuming       --last checkpoint was pending/running-->      running (re-attempt the interrupted stage)
resuming       --last checkpoint was a recovery/terminal state--> that same state, unchanged
```

### Terminal states

`completed`, `cancelled`, `failed`. Once reached, no further transition
is possible for that execution. A user who wants to try again creates a
**new** execution (`startPipeline`) — Milestone 11 does not "restart" a
terminal execution in place, to keep the historical record of what
happened honest and immutable.

### Recovery states

`retry_pending`, `stage_failed`, `resuming` — these are exactly the
states that exist to satisfy the backlog's "cannot restart a single
stage" complaint. `stage_failed` in particular is the state a user
actually interacts with: it is the only state that pauses for a human
decision (retry this stage, or cancel) rather than progressing
automatically.

---

## 7. Progress Model

**Stage weighting:** six stages, weighted **equally** (1/6 ≈ 16.7% each)
as the initial, honest default. There is no historical timing data yet
to justify weighting stages unevenly — inventing a weighting (e.g. "the
Decision stage is worth 30% because it's slower") without real
measurement would be exactly the kind of fabrication Phase 1 was
disciplined about avoiding everywhere else. Equal weighting is revisited
once real stage-duration telemetry exists (Section 15).

**Granularity:** progress advances in whole-stage increments — a stage
counts as `0%` of its own weight while running and `100%` of its weight
once it succeeds. This milestone does not interpolate smooth
in-progress percentages within a single stage (e.g. "43% through
Research"), because doing so would require guessing at a stage's
remaining duration before it's known — again, fabrication. Coarse,
honest, stage-granularity progress is the correct default; smooth
interpolation is a future enhancement once real per-stage duration data
exists to interpolate against (Section 15).

**Formula:**

```
progress = (completedStages / 6) * 100, rounded
```

where `completedStages` counts only stages that have actually succeeded
— a currently-`running` stage does not count toward its own completion
credit.

**Unknown duration handling / estimated remaining time:** computed only
from **this run's own** observed data, never a static guess:

```
averageStageDuration = mean(elapsed time of every completed stage so far)
estimatedRemaining = averageStageDuration * (6 - completedStages)
```

If zero stages have completed yet (still inside stage 1), no estimate is
shown at all — an honest "calculating..." state — rather than a
fabricated number with no basis. This mirrors the exact discipline
`lib/decision`'s `DecisionConfidence` applies to `dataFreshnessDays`:
absent, never a guessed placeholder.

---

## 8. Retry Strategy

**Automatic retry:** each stage has its own retry policy — conceptually
the same shape Milestone 5's `ProviderManager` established
(`timeoutMs`, `maxRetries`, `baseBackoffMs`, exponential backoff) at the
provider layer, reapplied here one layer up, at the stage layer. Default
proposal: `maxAutoRetries = 2` per stage, exponential backoff starting
at a few hundred milliseconds — deliberately conservative, since each
stage call is itself already backed by Milestone 5's own retry/timeout
layer *inside* `runResearch`/each provider call. A stage-level retry is
for the case where an entire platform call fails outright (e.g. its own
internal validation throws), not for retrying an individual HTTP
request — that's already handled two layers down and this milestone
must not duplicate it.

**Manual retry:** available once automatic retries are exhausted
(`stage_failed`). `retryStage(executionId)` re-invokes **only** the
failed stage's own platform call — it does not restart the pipeline
from stage 1, and it does not re-run any already-succeeded stage. This
directly satisfies the backlog's "cannot restart a single stage" item.

**Retry limits:** automatic retries are capped (`maxAutoRetries`, per
stage, configurable but defaulting to 2) to avoid silently hammering an
external dependency. Manual retries are **not** capped — a human
deciding to keep trying is a deliberate choice, not a runaway loop — but
every manual retry attempt increments a visible `manualRetryCount` on
that stage's record, so the execution history stays honest about how
many attempts it took.

---

## 9. Cancellation

**How it propagates:** cooperatively, at stage boundaries — **not**
instantaneous mid-stage abortion. This is a real, load-bearing
constraint, not a design shortcut: none of the six platforms' entry
points (`runResearch`, `discoverCompetitors`, `discoverMarket`,
`discoverFinancials`, `discoverBusiness`, `synthesizeDecision`) accept an
`AbortSignal` today. `PROVIDER_MANAGER.md` already documents this exact
gap at the provider layer ("`ResearchProvider.search()` has no
`AbortSignal` param yet"), and it holds all the way up the stack.
Requesting cancellation moves the execution to `cancelling`; the
in-flight stage is allowed to finish (its result, success or failure, is
still captured), and the pipeline transitions to `cancelled` **before**
starting the next stage rather than actually terminating any in-flight
network call.

**Partial results:** every stage that succeeded before cancellation
remains part of the `PipelineExecution` record and stays visible —
cancelling is not the same as discarding what was already learned.

**Cleanup:** Milestone 11 cleans up only its own state (marks the
checkpoint `cancelled`, releases any in-process listeners for that
execution). It does not need to clean up anything in the six knowledge
platforms, since none of them expose or require any cleanup — each
`discover*`/`synthesize*` call is a self-contained, side-effect-free
(from this pipeline's perspective) read.

---

## 10. Resume

**Checkpoint strategy:** after every stage transition (success, failure,
or exhausted retries), the pipeline persists the full
`PipelineExecution` record to its own store (Section 14). A checkpoint
is not a diff — it's the complete current state, so resuming never needs
to replay history.

**Resume after interruption** (e.g. a server restart mid-stage, so the
last checkpoint says `running` but nobody knows if that stage's call
actually finished): the pipeline moves to `resuming`, then **re-runs**
the interrupted stage rather than assuming it completed. This is safe
specifically because every stage call is a pure read with no side
effects on external state — re-running `discoverMarket()` a second time
after an interrupted first attempt costs an extra call, but never
produces an inconsistent result the way re-running a payment or a write
would.

**Resume after refresh** (a browser tab closes or reloads mid-run, but
the server-side/persisted execution never actually stopped): this is
the simple case — the client just calls `getExecution(executionId)` (or
re-subscribes via `subscribeToExecution`) to reconstruct exactly where
things stand. No special handling needed beyond the checkpoint already
existing, which is why checkpointing after every transition (not just
at the end) matters.

**A note on what "resumable" means for this milestone specifically:** a
synchronous request/response HTTP call cannot itself "keep running"
across a browser refresh. Milestone 11's initial scope achieves
resumability via **checkpointed, chunked execution** — each stage
transition is a discrete, persisted step, and a driver (server-side
cron/poll, or a client that calls back in) advances the execution one
stage at a time, checking the checkpoint before each step. A true
always-running background worker/queue is named explicitly as a later
extension point (Section 15), not something this milestone builds.

---

## 11. Event Model

**Events emitted**, per execution:

- `pipeline.started`
- `stage.started` (stage name, attempt number)
- `stage.completed` (stage name, result summary, duration)
- `stage.failed` (stage name, attempt number, error summary)
- `stage.retry_scheduled` (stage name, next attempt time)
- `pipeline.cancelling`
- `pipeline.cancelled`
- `pipeline.completed` (final `DecisionProfile` reference)
- `pipeline.failed` (fatal error summary)

**Payload:** every event carries `executionId`, a timestamp, the event
name, and an event-specific payload — never a raw error object or stack
trace (Section 12).

**Consumers:** a future UI (a live progress timeline is the direct
answer to the backlog's "no progress timeline" and "no clear execution
flow" items), and the checkpoint writer itself — the storage layer can
be implemented as just another subscriber that persists on every
`stage.*`/`pipeline.*` event, keeping "compute the transition" and
"persist the transition" as two separate, composable concerns.

**Ordering:** strictly sequential and FIFO per `executionId`, since
stages themselves run strictly sequentially by design (Section 5). No
ordering guarantee is needed *across* different executions — each is
independent. The initial implementation is an in-process pub/sub (the
same "Map-based, no external broker" spirit as Milestone 5's
`ProviderManager` metrics store); Section 15 names the future path to a
real event bus for multi-instance deployments.

---

## 12. Error Handling

- **Recoverable errors:** any error a stage's platform call throws is
  treated as auto-retryable by default — this covers the vast majority
  of real failures (a transient upstream issue, a validation hiccup),
  consistent with how `AppError`/`ExternalServiceError` are already
  used one layer down.
- **Fatal errors:** (a) invalid input (an empty/invalid `startupIdea`)
  — caught before `pending` is even created, the same
  `InvalidRequestError` pattern `lib/errors` already establishes; (b) an
  internal invariant violation (e.g. the pipeline's own state failing
  its own schema validation) — never retried, since retrying a broken
  invariant cannot fix it. Both map straight to the terminal `failed`
  state.
- **User-visible errors:** every stage failure surfaces a safe,
  human-readable summary — reusing `lib/errors`' existing
  `getErrorMessage`/`AppError.message` convention rather than inventing
  a second error-formatting mechanism. Never a raw stack trace, never a
  driver-level message.
- **Internal errors:** logged with full detail server-side only — the
  same "log the real error, show a generic message" split
  `jsonError` already applies elsewhere in this codebase (`CLAUDE.md`
  Section 12).

---

## 13. Data Flow

```
User Idea
  │
  ▼
[Pipeline: validate input]  ──invalid──▶ failed (terminal)
  │ valid
  ▼
Stage 1 — Research            runResearch({ topic: idea })
  │  captures ResearchResult, checkpoints, emits stage.completed
  ▼
Stage 2 — Competitors          discoverCompetitors({ startupIdea: idea })
  │  captures CompetitorDiscoveryResult, checkpoints, emits stage.completed
  ▼
Stage 3 — Market                discoverMarket({ startupIdea: idea })
  │  captures MarketDiscoveryResult, checkpoints, emits stage.completed
  ▼
Stage 4 — Financial             discoverFinancials({ startupIdea: idea })
  │  captures FinancialDiscoveryResult, checkpoints, emits stage.completed
  ▼
Stage 5 — Business               discoverBusiness({ startupIdea: idea })
  │  captures BusinessDiscoveryResult, checkpoints, emits stage.completed
  ▼
Stage 6 — Decision                synthesizeDecision({ startupIdea: idea })
  │  captures DecisionSynthesisResult, checkpoints
  ▼
Final Result = DecisionSynthesisResult.profile   (the DecisionProfile)
  │
  ▼
pipeline.completed  →  completed (terminal)
```

**Important, honest note on this data flow:** each stage is
independently self-sufficient (per Section 5) — Stage 3 does not feed
its `MarketDiscoveryResult` into Stage 4 as an input parameter, because
`discoverFinancials()` doesn't accept one. Stage 4 (and 5, and 6)
**internally, redundantly** re-derive market/competitor/research data
themselves, exactly as they already do today with or without this
pipeline. What the pipeline adds is *visibility* into that same chain,
not a data-passing optimization of it. See Section 18 for the
consistency implication this has.

---

## 14. Internal Modules

**Proposed folder structure** (not created by this document — for
review only):

```
lib/pipeline/
├── stages/        One file per stage, each a thin wrapper around exactly
│                  one platform's public entry point behind a common
│                  PipelineStage contract (research.ts, competitors.ts,
│                  market.ts, financial.ts, business.ts, decision.ts).
├── state/          The state machine: valid states, valid transitions,
│                  a pure transition-validator function.
├── progress/     Progress-percentage and estimated-remaining-time
│                  calculation (Section 7) — pure functions over an
│                  execution record.
├── retry/           Retry policy + exponential backoff calculator —
│                  mirrors ProviderManager's pattern one layer up.
├── events/          The event emitter/pub-sub and event payload schemas.
├── checkpoint/  Reads/writes a PipelineExecution via storage/ —
│                  the one place "compute a transition" and "persist a
│                  transition" meet.
├── storage/        PipelineExecutionStore interface + Memory (real) and
│                  Supabase/Postgres/Warehouse (architecture-only)
│                  backends + a createStore() factory — the same
│                  four-backend pattern every Phase 1 platform used.
├── engine/          The orchestrator: startPipeline/resumePipeline/
│                  retryStage/cancelPipeline/getExecution — the single
│                  place that sequences stages, drives the state
│                  machine, emits events, and writes checkpoints.
├── schemas/       Every Zod schema (PipelineExecution, StageResult,
│                  PipelineEvent, ...) — one schema per shape, reused
│                  everywhere, same discipline as every Phase 1 platform.
├── types/            Non-schema contracts (the PipelineStage interface,
│                  the event listener type).
└── utils/            Small local helpers. (Per ARCHITECTURE_REVIEW.md
                     Technical Debt #1, this would be the sixth
                     independent copy of the same tiny dedupe/normalize
                     helpers — see Section 18.)
```

**Module responsibilities:** `engine/` is the only module allowed to
depend on all the others; every other module is a narrow, single-purpose
layer `engine/` composes. `stages/` depends only on `schemas/`/`types/`
(and the six platforms' public barrels) — never on `engine/`, to avoid a
reverse dependency. `storage/` depends only on `schemas/`/`types/`.

**Dependency direction:**

```
lib/pipeline/engine/
        │
        ├──▶ lib/pipeline/stages/  ──▶  lib/research, lib/competitors,
        │                                 lib/market, lib/financial,
        │                                 lib/business, lib/decision
        │                                 (public barrels only)
        ├──▶ lib/pipeline/state/
        ├──▶ lib/pipeline/progress/
        ├──▶ lib/pipeline/retry/
        ├──▶ lib/pipeline/events/
        └──▶ lib/pipeline/checkpoint/  ──▶  lib/pipeline/storage/

lib/pipeline/schemas/  and  lib/pipeline/types/  are depended on by
  everything above them; they depend on nothing inside lib/pipeline/.
```

No platform below `lib/pipeline/` may ever import from it — a rule this
document repeats deliberately, because it is the single most important
invariant `ARCHITECTURE_REVIEW.md` verified and this milestone must not
break.

---

## 15. Future Extension Points

- **Streaming.** Partial, in-stage results (not just stage-boundary
  results) would require the underlying platforms to support
  incremental output, which none do today — each `discover*` call is
  atomic. Not addressable without a Phase 1 amendment.
- **Background workers / a queue system.** The real fix for "resumable
  across a server restart or multiple instances" without a client
  needing to stay connected or poll. Today's chunked-checkpoint design
  (Section 10) is a deliberate, simpler stand-in for this milestone's
  scope.
- **Distributed execution.** Running independent stages on separate
  workers would conflict with today's deliberate sequential-for-
  observability design (Section 5) — would need that tradeoff
  revisited first.
- **Real-time updates.** WebSocket/SSE push of the event stream
  (Section 11) instead of polling `getExecution` — the event model is
  designed so this is an additive subscriber, not a redesign.
- **AbortSignal support upstream.** If a future Phase 1 amendment adds
  an `AbortSignal` parameter to `runResearch`/`discover*`/
  `synthesizeDecision`, true mid-stage cancellation becomes possible;
  until then, cancellation stays stage-boundary-scoped (Section 9).
- **Pre-fetched context params upstream.** If a future Phase 1
  amendment lets `discover*` functions accept already-computed lower-
  layer results, the redundant-recompute cost (Section 18) could be
  eliminated. Out of scope for this milestone — Phase 1 is frozen.
- **Uneven, telemetry-based stage weighting and smooth intra-stage
  progress interpolation** (Section 7), once real duration data exists
  to justify either honestly.

---

## 16. Verification Strategy

- **Type checking:** `npx tsc --noEmit`, same bar as every Phase 1
  milestone — zero errors.
- **Lint:** `npx eslint app components lib hooks` — zero new errors
  beyond the pre-existing, unrelated `Testimonials.tsx` issue.
- **Build validation:** `npm run build` — must succeed with the same
  route count as today (this milestone adds no routes).
- **Runtime verification:** the same "temporary scratch page, curl
  against the running dev server, delete before final build" technique
  used in every Phase 1 milestone — but for the first time, exercised
  **across the full six-layer stack in one test**, since this is the
  first milestone whose job is literally to drive all six at once.
  Concretely, the scratch page should exercise: a full run from
  `pending` to `completed`; a simulated stage failure followed by
  successful auto-retry; a simulated stage failure that exhausts
  auto-retries, reaching `stage_failed`, followed by a successful
  manual `retryStage`; cancellation mid-run, verifying partial results
  are retained and no further stage starts; and checkpoint persistence
  + `resumePipeline`, verifying a "fresh load" reconstructs the correct
  state without re-running already-succeeded stages.

---

## 17. Definition of Done

1. `lib/pipeline/` exists exactly per Section 14; every stage wraps
   exactly one platform's public entry point; zero deep imports into
   any platform's internals (verified by grep, the same technique
   `ARCHITECTURE_REVIEW.md` Check 1 used).
2. The state machine is implemented exactly as Section 6 specifies;
   every transition in the table is covered by a runtime check.
3. Progress, retry, cancellation, resume, and the event model are all
   implemented per Sections 7–11, each independently runtime-verified.
4. `tsc --noEmit`, `eslint`, and `npm run build` are all clean, matching
   Phase 1's own bar.
5. A `PIPELINE.md`-equivalent documentation file (name TBD at
   implementation time) is written, matching the depth and honesty
   standard of the six Phase 1 platform docs — including explicitly
   documenting the redundant-recompute and cooperative-cancellation
   tradeoffs named in this design.
6. A temporary scratch verification page is created, every scenario in
   Section 16 passes, and the page is deleted before the final build.
7. `git status` shows only `lib/pipeline/` and its documentation as new
   — no frozen path (`lib/analysis/`, `lib/research/`,
   `lib/competitors/`, `lib/market/`, `lib/financial/`, `lib/business/`,
   `lib/decision/`, `lib/store/`, `app/api/`, `lib/schemas/`) touched.
8. Nothing is committed until explicitly requested.

---

## 18. Risks

**Architectural**

- **Redundant recompute across stages.** Because no `discover*`/
  `synthesize*` function accepts pre-fetched context, stages 2–6 each
  internally redo some or all of the work stages before them already
  did. This is inherent to Phase 1's self-contained-by-design platforms,
  not a defect Milestone 11 introduces or can fix without a Phase 1
  amendment. Accepted cost, documented rather than hidden.
- **Cross-stage consistency.** Stage 6's `synthesizeDecision()` call
  internally re-derives Market/Financial/Business data a second time;
  because `runResearch()` calls aren't guaranteed deterministic between
  separate invocations, the final `DecisionProfile` is not guaranteed
  to byte-match what stages 3–5 already showed the user. This should be
  surfaced honestly in the final UI copy (a future milestone's concern),
  not hidden.
- **No true mid-stage cancellation.** Cooperative, stage-boundary-only,
  because no upstream `AbortSignal` support exists (Section 9). A
  long-running stage cannot be interrupted mid-call.

**Performance**

- **Sequential-for-observability tradeoff.** Running six stages
  sequentially (rather than the concurrency `synthesizeDecision()`
  already uses internally) means total wall-clock time is the sum of
  all six stages' durations, each of which itself redundantly repeats
  earlier work. This is slower, deliberately, in exchange for real
  progress visibility. If real usage shows this tradeoff is wrong,
  revisiting it is a valid future direction — but it should be measured,
  not guessed.
- **Real-provider cost multiplication.** Once real search-provider
  credentials are ever configured, six sequential stages each
  independently triggering their own research calls could meaningfully
  multiply real API/token spend versus one atomic `synthesizeDecision()`
  call. Worth flagging to whoever eventually turns on real credentials.

**Future scaling**

- **In-process execution state.** The initial design's event emitter
  and (if implemented as in-memory-first) execution state work for a
  single instance; a multi-instance deployment needs the checkpoint
  store to be the sole source of truth (already the design, per Section
  10) and the event bus to become a real message broker (Section 15) —
  not solved by this milestone, only kept from being architecturally
  blocked by it.
- **Utility duplication, now overdue.** `ARCHITECTURE_REVIEW.md`
  Technical Debt #1 flagged the same small `dedupeByKey`/`urlDedupeKey`-
  style helpers being reimplemented in every platform as worth
  consolidating "before it compounds further." This would be the sixth
  independent copy. This milestone is a reasonable point to actually
  extract a shared, frozen-safe utility module rather than deferring
  again — a decision for the approval discussion, not something this
  document unilaterally resolves.

---

## 19. Sequence Diagram

```
Client                 Engine                Stage(N)            Platform(N)          Checkpoint Store
  │                       │                      │                     │                     │
  │  startPipeline(idea)  │                      │                     │                     │
  ├──────────────────────▶│                      │                     │                     │
  │                       │  validate input      │                     │                     │
  │                       │  create execution     │                     │                     │
  │                       │──────────────────────────────────────────────────────────────────▶│ (checkpoint: pending)
  │                       │                      │                     │                     │
  │                       │  emit pipeline.started│                     │                     │
  │                       │  emit stage.started(1)│                     │                     │
  │                       │─────────────────────▶│                     │                     │
  │                       │                      │  runResearch(...)   │                     │
  │                       │                      │────────────────────▶│                     │
  │                       │                      │                     │  (research work)    │
  │                       │                      │◀────────────────────│                     │
  │                       │◀─────────────────────│  ResearchResult     │                     │
  │                       │  emit stage.completed(1)                    │                     │
  │                       │──────────────────────────────────────────────────────────────────▶│ (checkpoint: running, stage 2)
  │                       │                      │                     │                     │
  │                       │        ... repeat for stages 2–5 ...        │                     │
  │                       │                      │                     │                     │
  │                       │  emit stage.started(6)│                     │                     │
  │                       │─────────────────────▶│                     │                     │
  │                       │                      │ synthesizeDecision()│                     │
  │                       │                      │────────────────────▶│                     │
  │                       │                      │◀────────────────────│                     │
  │                       │◀─────────────────────│ DecisionSynthesisResult                    │
  │                       │  emit stage.completed(6)                    │                     │
  │                       │  emit pipeline.completed                    │                     │
  │                       │──────────────────────────────────────────────────────────────────▶│ (checkpoint: completed)
  │◀──────────────────────│  PipelineExecution (completed)               │                     │
  │                       │                      │                     │                     │

  ── Failure / retry branch (any stage N) ──

  │                       │                      │  throws              │                     │
  │                       │◀─────────────────────│                     │                     │
  │                       │  retries < max? ──yes──▶ emit stage.retry_scheduled                │
  │                       │                      │  (backoff) → re-invoke Stage(N)             │
  │                       │  retries exhausted ──▶ emit stage.failed                            │
  │                       │──────────────────────────────────────────────────────────────────▶│ (checkpoint: stage_failed)
  │◀──────────────────────│  PipelineExecution (stage_failed)            │                     │
  │                       │                      │                     │                     │
  │  retryStage(id)       │                      │                     │                     │
  ├──────────────────────▶│  re-invoke Stage(N) only                     │                     │
  │                       │─────────────────────▶│ ...                 │                     │

  ── Cancellation branch ──

  │  cancelPipeline(id)   │                      │                     │                     │
  ├──────────────────────▶│  state → cancelling                          │                     │
  │                       │  (let in-flight Stage(N) settle)             │                     │
  │                       │◀─────────────────────│  result (any outcome)│                     │
  │                       │  state → cancelled                            │                     │
  │                       │  emit pipeline.cancelled                      │                     │
  │                       │──────────────────────────────────────────────────────────────────▶│ (checkpoint: cancelled)
  │◀──────────────────────│  PipelineExecution (cancelled, partial results)│                     │
```

---

## 20. Milestone Plan

Proposed implementation sub-phases, each independently buildable and
verifiable, in dependency order:

**11.1 — Schemas, types, and state machine (no execution logic).**
`schemas/` (PipelineExecution, StageResult, PipelineEvent, retry policy
shapes), `types/` (PipelineStage contract, listener type), and `state/`
(the transition table from Section 6 as a pure, testable validator
function). Nothing runs yet; this is the vocabulary everything else is
built on.

**11.2 — Stage wrappers, progress, and retry policy (pure logic,
verifiable in isolation).** One file per platform in `stages/`, each a
thin, typed wrapper satisfying the `PipelineStage` contract; `progress/`
(Section 7's formulas as pure functions over a stage-result list);
`retry/` (backoff calculator). Each of these is independently runtime-
verifiable without needing the full engine — e.g. a stage wrapper can be
called directly and its result shape checked before any orchestration
exists.

**11.3 — Checkpoint storage.** `storage/` (Memory — real — plus
architecture-only Supabase/Postgres/Warehouse, and a `createStore()`
factory, matching every Phase 1 platform's pattern) and `checkpoint/`
(reads/writes a full `PipelineExecution` through that store).

**11.4 — The engine.** `engine/` and `events/` together: sequencing
stages via `state/`'s transition table, computing progress via
`progress/`, applying `retry/`'s policy, persisting via `checkpoint/`
after every transition, and emitting `events/`'s event stream at each
step. This is where `startPipeline`/`resumePipeline`/`retryStage`/
`cancelPipeline`/`getExecution`/`subscribeToExecution` actually get
implemented, composing everything built in 11.1–11.3.

**11.5 — Documentation and full verification.** The platform doc
(Section 17, item 5), the temporary scratch-page verification exercising
every scenario in Section 16, and the full `tsc`/`eslint`/`build`
validation triad — the same closing ritual every Phase 1 milestone
followed.

Each sub-phase produces a working, typed, verifiable slice; 11.4 is the
only phase that requires all the others to already exist, which is
exactly why it's sequenced last.

---

## 21. Pipeline Context

**Every stage appends its own output to a single, shared, append-only
object — the Pipeline Context.** It is the one thing that actually grows
as an execution progresses; everything else in this design (progress,
checkpoints, partial results, the final result) is a view onto it.

```
Idea
  │
  ▼
Pipeline Context { startupIdea }
  │
  ▼  Stage 1 succeeds
Pipeline Context { startupIdea, research }
  │
  ▼  Stage 2 succeeds
Pipeline Context { startupIdea, research, competitors }
  │
  ▼  Stage 3 succeeds
Pipeline Context { startupIdea, research, competitors, market }
  │
  ▼  Stage 4 succeeds
Pipeline Context { startupIdea, research, competitors, market, financial }
  │
  ▼  Stage 5 succeeds
Pipeline Context { startupIdea, research, competitors, market, financial, business }
  │
  ▼  Stage 6 succeeds
Pipeline Context { startupIdea, research, competitors, market, financial, business, decision }
```

Each named field is exactly the result Section 5 already lists that
stage as capturing (`ResearchResult`, `CompetitorDiscoveryResult`,
`MarketDiscoveryResult`, `FinancialDiscoveryResult`,
`BusinessDiscoveryResult`, `DecisionSynthesisResult`) — the Pipeline
Context isn't a new shape for that data, it's the single record that
holds all six of them together as they accumulate. A field is only ever
added, never removed or overwritten; a stage that later fails or is
retried doesn't erase what earlier stages already contributed.

**What the Context is used for**, tying back to earlier sections:

- **Checkpointing (Section 10):** the Context, as it stands at that
  moment, is exactly what gets persisted after every stage transition —
  a checkpoint is a snapshot of the Context plus the state-machine
  fields (current state, retry counts, timestamps), not a separate
  structure.
- **Partial results (Section 9):** if execution is cancelled after
  Stage 3, the Context still holds `research`, `competitors`, and
  `market` — that's precisely what "partial results are retained" means
  concretely.
- **The final result (Section 4, 13):** once Stage 6 succeeds, the
  Context's `decision` field — specifically its
  `DecisionSynthesisResult.profile` — is the `DecisionProfile` returned
  as the pipeline's final output.

**What the Context is *not*, and this is the important boundary:** it is
never passed as an input to any platform call. Every stage still invokes
its platform function with exactly `{ startupIdea }`, precisely as
Section 5 specifies — `discoverMarket()` does not receive the Context's
`research`/`competitors` fields as parameters, because it has no
parameter to receive them into, and this milestone does not add one.
The Context is populated **after** a stage's call returns, purely by the
orchestration engine appending that stage's own output; it is never
consulted **before** a call to construct that call's input. This is also
why the redundant-recompute tradeoff already named in Section 18 stands
unchanged — the Context makes prior stages' outputs *visible*, not
*reusable* as input, since reusability would require a Phase 1 platform
signature change, which is out of scope.

**Scope:** the Pipeline Context exists only inside `lib/pipeline/` — as
a shape in `lib/pipeline/schemas/` (or equivalently, as the `results`
field of `PipelineExecution` from Section 4), built and read only by
`lib/pipeline/engine/`. It does not change, extend, or wrap any Phase 1
platform's request or response schema. No completed platform is
redesigned by this section — `lib/research/`, `lib/competitors/`,
`lib/market/`, `lib/financial/`, `lib/business/`, and `lib/decision/`
each remain exactly as Phase 1 built and froze them.

---

## 22. Future Refactor Candidate

**Recorded here for the record — nothing in this section is implemented
by Milestone 11.** `ARCHITECTURE_REVIEW.md`'s Technical Debt #1 already
identified that several small, generic utilities are independently
reimplemented in every knowledge platform rather than shared:

- **URL normalization / dedupe** — `urlDedupeKey` (or an inline
  equivalent) appears separately in `lib/competitors/`, `lib/market/`,
  `lib/financial/`, `lib/business/`, and `lib/decision/`.
- **Generic dedupe-by-key helpers** — `dedupeByKey<TItem>(items, keyFn)`
  appears separately in `lib/market/`, `lib/financial/`,
  `lib/business/`, and `lib/decision/`.
- **Confidence aggregation** — the "average of known values, honestly
  absent when there's nothing to average" pattern appears separately as
  each platform's own `computeDiscoveryConfidence`/
  `computeDecisionConfidence`-style function (`lib/market/`,
  `lib/financial/`, `lib/business/`, `lib/decision/`), each a
  near-identical reimplementation of the same idea rather than one
  shared calculation.
- **Label/name normalization** — `normalizeLabel`/`normalizeCompanyName`/
  `normalizeIndustryName` — the same "lowercase, trim, collapse
  whitespace" logic, reimplemented with minor variations per platform.

Milestone 11's own `lib/pipeline/utils/` (Section 14) would, on current
plans, become a sixth independent copy of at least the first two of
these — the point at which this stops being a minor, watchable pattern
and becomes debt actually worth paying down.

**For the avoidance of doubt:**

- **No refactor is part of Milestone 11.** This section documents a
  future candidate; it authorizes nothing to be built now.
- **No runtime behavior should change** as a result of recording this.
  Every platform's own copy of these helpers keeps working exactly as
  it does today.
- **No shared module is introduced during this milestone.**
  `lib/pipeline/utils/` is still built as its own local copy, per
  Section 14, consistent with every prior platform's own precedent —
  not blocked on, and not pre-empting, this future cleanup.

This is recorded as future technical debt, to be addressed once Phase
2's roadmap is complete — a dedicated consolidation pass (a shared,
frozen-safe utility module every platform migrates to) rather than a
change bundled quietly into any single feature milestone.

---

*End of design specification. Awaiting approval before any
implementation begins.*
