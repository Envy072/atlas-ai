# Atlas AI — Execution Pipeline

Milestone 11: the Execution Pipeline. This document describes
`lib/pipeline/` — the orchestration layer that sits above all six
completed knowledge platforms (`lib/research/`, `lib/competitors/`,
`lib/market/`, `lib/financial/`, `lib/business/`, `lib/decision/`) and
runs them as one observable, retryable, cancellable, resumable sequence
instead of one opaque call. It implements the design specified and
approved in `MILESTONE_11_DESIGN.md` — that document is the authoritative
architectural rationale; this one documents what was actually built and
verified. (Not to be confused with the pre-existing, unrelated
`PIPELINE.md`, which documents Milestone 1's `lib/analysis/` Analysis
Pipeline — a different pipeline, frozen, untouched by this milestone.)

**Status: not wired into the application.** Nothing in `lib/analysis/`,
`lib/research/`, `lib/competitors/`, `lib/market/`, `lib/financial/`,
`lib/business/`, `lib/decision/`, `lib/store/`, `app/api/`, or
`lib/schemas/` imports from `lib/pipeline/` — every one of those paths is
frozen and remains completely unchanged. `lib/pipeline/` is
free-standing, and consumes exactly six things from outside itself: each
platform's own public barrel (`runResearch`, `discoverCompetitors`,
`discoverMarket`, `discoverFinancials`, `discoverBusiness`,
`synthesizeDecision`, plus the six result schemas/types each barrel
exports) — never a deep import, never a provider, never any platform's
internals.

---

## Why This Exists

`synthesizeDecision()` already chains all six platforms into one
`DecisionProfile`, but it is one atomic `async` call — no stage
visibility, no cancellation, no per-stage retry, nothing to resume.
`PRODUCT_BACKLOG.md`'s highest-priority section, drawn from real user
testing, names exactly this gap: *"Cannot see the current analysis
stage. Cannot see how much analysis remains. No progress timeline.
Cannot cancel analysis. Cannot restart a single stage. No clear
execution flow."* This milestone closes that gap by wrapping the six
platforms in an execution runtime, adding zero new domain knowledge.

---

## Architecture

Ten folders, exactly as specified in `MILESTONE_11_DESIGN.md` Section
14:

```
lib/pipeline/
├── stages/        6 thin wrappers, one per platform's public entry point
├── state/          The state-machine transition table + validator
├── progress/     Real, honest progress + estimated-remaining-time
├── retry/           Retry policy, backoff, and history-derived retry counts
├── events/          In-process pub/sub event emitter
├── storage/        PipelineExecutionStore + Memory/Supabase/Postgres/Warehouse
├── checkpoint/  Reads/writes a PipelineExecution through storage/
├── engine/          The orchestrator — every public entry point
├── schemas/       Every Zod schema — one per shape, reused everywhere
├── types/            Non-schema contracts (PipelineStageDefinition, store, retry policy, event listener)
└── utils/            One helper: an execution-id generator (see "A Pleasant Deviation" below)
```

**Dependency direction**, verified by grep the same way
`ARCHITECTURE_REVIEW.md` Check 1 verified the six platforms below it:
`engine/` depends on `stages/`, `state/`, `progress/`, `retry/`,
`events/`, `checkpoint/`; `stages/` depends only on the six platforms'
public barrels; nothing below `lib/pipeline/` imports from it. Confirmed
zero deep imports into any platform's internals anywhere in
`lib/pipeline/`.

---

## Data Flow

```
User Idea
  │
  ▼
startPipeline({ startupIdea })
  │  validate input (before any execution record is even created)
  ▼
buildInitialExecution → PipelineExecution { state: pending, context: { startupIdea } }
  │  checkpoint, transition to running, emit pipeline.started
  ▼
Stage 1 — Research         runResearch({ topic: "general research pass for: <idea>" })
  │  context.research populated · checkpoint · emit stage.completed
  ▼
Stage 2 — Competitors        discoverCompetitors({ startupIdea })
  │  context.competitors populated · checkpoint · emit stage.completed
  ▼
Stage 3 — Market                discoverMarket({ startupIdea })
  │  context.market populated · checkpoint · emit stage.completed
  ▼
Stage 4 — Financial             discoverFinancials({ startupIdea })
  │  context.financial populated · checkpoint · emit stage.completed
  ▼
Stage 5 — Business               discoverBusiness({ startupIdea })
  │  context.business populated · checkpoint · emit stage.completed
  ▼
Stage 6 — Decision                synthesizeDecision({ startupIdea })
  │  context.decision populated · checkpoint · emit stage.completed
  ▼
state → completed, emit pipeline.completed
  │
  ▼
Final Result = context.decision.profile   (the DecisionProfile)
```

Every stage still calls its own platform with only `{ startupIdea }` —
exactly as `MILESTONE_11_DESIGN.md` Section 21 specifies. The Pipeline
Context accumulates each stage's *output* for observability; it is never
fed back in as another stage's *input*, since none of the six platforms'
entry points accept pre-fetched context. This means stages 2–6 each
redundantly re-derive some of what earlier stages already computed
internally — an accepted, documented cost (see Risks), not a defect.

---

## The Pipeline Context

`schemas/context.schema.ts`'s `PipelineContext` is exactly what
`MILESTONE_11_DESIGN.md` Section 21 describes: `{ startupIdea }` at the
start, gaining one named field — `research`, `competitors`, `market`,
`financial`, `business`, `decision` — as each stage succeeds, in order,
never removed or overwritten. Every field reuses that platform's own
result schema (`ResearchResult`, `CompetitorDiscoveryResult`,
`MarketDiscoveryResult`, `FinancialDiscoveryResult`,
`BusinessDiscoveryResult`, `DecisionSynthesisResult`) imported directly
from its public barrel — this file defines no new shape, only the
object that holds all six together.

---

## State Machine

Implemented exactly per `MILESTONE_11_DESIGN.md` Section 6, with one
deliberate simplification from the design, noted there as acceptable:
**`resuming` is never itself a persisted state.** `resumePipeline()`
resolves it synchronously — read the checkpoint, decide what to do
(re-attempt an interrupted stage, or return a recovery/terminal state
as-is), act — within one function call, so it is never observed in
storage. `state/stateMachine.ts` encodes eight persisted states
(`pending`, `running`, `retry_pending`, `stage_failed`, `cancelling`,
`completed`, `cancelled`, `failed`) and their valid transitions as an
explicit table; `assertTransition()` is called at every state change the
engine makes, so an invalid transition throws immediately rather than
silently corrupting a checkpoint. Verified live: valid transitions
succeed, invalid ones (`completed → running`, `pending → completed`) are
correctly rejected.

One addition beyond the design's own table: `running → failed` exists
for a genuine internal invariant violation (this platform's own
checkpoint schema failing to validate) — see Error Handling below for
exactly how that stays separate from an ordinary, retryable stage
failure.

---

## Progress Model

`progress/progressCalculator.ts`'s `computeProgress()` implements
Section 7 exactly: equal 1/6 weighting per stage (the honest starting
default — no real duration telemetry exists yet to justify anything
else), whole-stage-granularity percentage (a running stage contributes
0% of its own weight until it succeeds), and an estimated-remaining-time
computed only from **this run's own** observed stage durations —
verified live to be `undefined`, not `0`, whenever no stage has
completed yet to average from.

---

## Retry Strategy

`retry/retryPolicy.ts`'s `DEFAULT_PIPELINE_RETRY_POLICY`
(`maxAutoRetries: 2`, exponential backoff from a 300ms base) is
deliberately conservative, since each stage call is already backed by
Milestone 5's own `ProviderManager` retry/timeout layer two levels down
— this policy is for an entire platform call failing outright, not for
retrying individual HTTP requests, which must not be duplicated here.

Retry counts are never tracked as separate mutable counters —
`retry/retryStats.ts`'s `countAutoRetries`/`countManualRetries`/
`nextAttemptNumber` all derive their answer from `stageHistory`, so a
count can never drift from what actually happened. Verified live:
`retryStage()` against a hand-seeded, already-failed stage correctly
computes attempt `2` (continuing from the prior failed attempt `1`, not
resetting to `1`), tags it `manual_retry`, and — because the underlying
platform call succeeds — completes the rest of the pipeline for real.

---

## Cancellation

Cooperative and stage-boundary-scoped, exactly per Section 9 — never an
instantaneous mid-stage abort, because none of the six platforms accept
an `AbortSignal` today (the same gap `PROVIDER_MANAGER.md` already
documents at the provider layer). `cancelPipeline()`'s behavior depends
on what's actually in flight: a `running` execution moves to
`cancelling` (a stage is genuinely executing; the loop observes this at
the next stage boundary and finalizes to `cancelled`); a `stage_failed`
or `retry_pending` execution cancels **immediately** (nothing is
actually in flight — just a paused failure or a scheduled backoff); an
already-terminal execution is a safe no-op. All four branches were
verified live against hand-seeded executions.

**A race this implementation specifically closes:** if `cancelPipeline()`
is called while a stage is genuinely mid-call, and that stage then
succeeds, a naive implementation would blindly re-persist the in-memory
`state: "running"` it started with — silently clobbering the
concurrently-written `"cancelling"` back to `"running"` and defeating the
cancellation. `engine/pipelineEngine.ts`'s
`checkpointPreservingConcurrentState()` re-fetches the persisted state
immediately before that specific write and preserves it instead of
blindly overwriting — see Lessons Learned in the completion report for
why this was worth fixing rather than deferring.

---

## Resume

Checkpoint-based, per Section 10. Every transition — every stage
attempt, every retry, every cancellation request — is persisted as the
**full** current `PipelineExecution`, never a diff, so resuming never
replays history. `resumePipeline()`'s behavior: a terminal state
(`completed`/`cancelled`/`failed`) or a recovery state that already
reflects reality (`retry_pending`/`stage_failed`/`cancelling`) is
returned as-is — "resume" just means "load." Only `pending`/`running`
(where the process may have died mid-stage, so we can't know if that
stage's call truly finished) triggers a real re-attempt — safe because
every stage is a pure read with no side effects on external state.
Verified live: a hand-seeded `running` checkpoint (simulating an
interruption before stage 1 ever completed) correctly re-attempts and
drives to `completed`, tagged `resumed`; calling `resumePipeline()` again
on the now-`completed` execution correctly returns it unchanged.

---

## Event Model

`events/eventEmitter.ts` is an in-process, per-`executionId` pub/sub —
the same "Map-based, no external broker" spirit as Milestone 5's
`ProviderManager` metrics store. Nine event types are emitted at every
state transition (`pipeline.started`, `stage.started`,
`stage.completed`, `stage.failed`, `stage.retry_scheduled`,
`pipeline.cancelling`, `pipeline.cancelled`, `pipeline.completed`,
`pipeline.failed`), each carrying a safe, human-readable `message` where
relevant — never a raw error object. Ordering is FIFO per execution
because the engine only ever emits synchronously from its own sequential
stage loop.

---

## Error Handling

Two error classes, kept structurally separate rather than merely
documented apart:

- **Recoverable (the vast majority):** any error a stage's platform call
  throws. Caught by a `try/catch` scoped to *exactly* `stage.run()`'s own
  promise inside `executeStageWithRetry()` — nothing else is inside that
  try block.
- **Fatal:** invalid input, caught by `parseOrThrow` in `startPipeline()`
  before any execution record exists; and a genuine internal invariant
  violation, caught by `checkpoint/checkpointWriter.ts`'s own
  `parseOrThrow` against `PipelineExecutionSchema` — deliberately placed
  *outside* every stage's try/catch, so a schema bug in this platform's
  own code propagates as a real, uncaught error instead of being
  misclassified as a retryable stage failure and uselessly retried.

Every user-visible message reuses `lib/errors`' existing
`getErrorMessage`/`InvalidRequestError` — no second error-formatting
mechanism was invented.

---

## Storage

`types/storage.ts`'s `PipelineExecutionStore` (`getById`, `list`,
`upsert`, `delete`) mirrors every Phase 1 platform's own store interface
— no secondary index, for the same reason `lib/decision`'s
`DecisionKnowledgeStore` has none. `storage/memoryStore.ts`'s
`MemoryPipelineStore` is real; `SupabasePipelineStore`,
`PostgresPipelineStore`, and `KnowledgeWarehousePipelineStore` (the last
adding one warehouse-specific `aggregateByState()` method) are
architecture-only and honestly throw. `storage/createStore.ts` is the
single factory every caller depends on, defaulting to memory. Verified
live: the default backend is memory, and `SupabasePipelineStore` throws
rather than silently no-op-ing.

---

## A Pleasant Deviation From the Anticipated Debt

`MILESTONE_11_DESIGN.md` Section 22 flagged that `lib/pipeline/utils/`
would likely become a sixth independent copy of the small
`dedupeByKey`/`urlDedupeKey`-style helpers duplicated across every prior
platform. It didn't: the Pipeline Context has no arrays of structured
list items to dedupe (each stage occupies exactly one fixed, named
field, never a list), so this domain simply never needed those helpers.
`utils/` ended up holding exactly one thing — an execution-id generator.
The Future Refactor Candidate section's debt count therefore stays at
five copies, not six, after this milestone; still worth the
consolidation pass Section 22 describes, just not made worse here.

---

## Runtime Verification

Exercised live via a temporary scratch route
(`app/pipeline-sanity-check/page.tsx`) against the running dev server,
then deleted before the final build. **Every check passed**, including:

- Pure logic: `canTransition`/`isTerminalState` against the real state
  table; `computeProgress` against empty and partial histories,
  producing a real time estimate from real observed durations;
  `computeBackoffMs`'s exponential doubling; `countAutoRetries`/
  `countManualRetries`/attempt continuation derived correctly from a
  hand-built history.
- **A full, real, end-to-end run** — `startPipeline()` against a real
  idea, driving all six platforms for real, reaching `completed` at
  100% progress with all six `context` fields populated and exactly six
  succeeded `stageHistory` records. This is the first milestone in this
  codebase whose own verification genuinely exercises the entire
  Research → Decision stack in a single test.
- All four `cancelPipeline()` branches (running → cancelling,
  stage_failed/retry_pending → cancelled immediately, terminal → no-op).
- `resumePipeline()` against a hand-seeded interrupted checkpoint,
  correctly re-attempting and completing; and correctly returning an
  already-terminal execution unchanged.
- `retryStage()` against a hand-seeded failed checkpoint, correctly
  continuing the attempt count, tagging the retry, completing the rest
  of the run for real, and correctly refusing a second retry once the
  execution is no longer `stage_failed`.
- Storage defaults and the architecture-only backends' honest failure.

**Not verified:** the automatic-retry-after-a-genuinely-failing-platform-
call path specifically, since none of the six platforms fail in this
environment (no search-provider credentials are configured — see
`PROVIDER_MANAGER.md`). The retry *mechanics* this path depends on
(attempt continuation, trigger tagging, backoff calculation) were
verified directly as pure functions and via the manual-retry test, which
exercises the identical code path — but the literal "a real call throws,
auto-retry catches it, a second real call succeeds" sequence was not
observed end-to-end in this environment.

---

## Definition of Done — Verified

Every item in `MILESTONE_11_DESIGN.md` Section 17 is satisfied: the
folder structure matches Section 14 exactly; zero deep imports (grep-
verified); the state machine is implemented and runtime-checked; progress,
retry, cancellation, resume, and the event model are all implemented and
independently verified; `tsc`/`eslint`/`build` are all clean; this
document matches the depth of the six Phase 1 platform docs; the scratch
verification page was deleted before the final build; and no frozen path
was touched.

---

## Risks Carried Forward From the Design (Now Confirmed, Not Just Anticipated)

- **Redundant recompute across stages** — confirmed in the full
  end-to-end run: stages 2–6 each internally redid some of what earlier
  stages already computed. Inherent to Phase 1's self-contained-by-design
  platforms; accepted cost.
- **Cross-stage consistency** — not directly observed in this run (no
  configured providers means every platform's own research call returns
  the same honest-empty result regardless of how many times it's
  called), but remains a real risk once real, non-deterministic search
  results are in play, exactly as the design anticipated.
- **No true mid-stage cancellation** — confirmed: cancellation is
  cooperative and stage-boundary-scoped, as designed.
- **Sequential-for-observability performance cost** — confirmed:
  running six stages sequentially, each redundantly repeating earlier
  work, costs real wall-clock time a direct `synthesizeDecision()` call
  wouldn't pay. Deliberate, documented tradeoff.

---

## Future Extension Points

Unchanged from `MILESTONE_11_DESIGN.md` Section 15 — streaming,
background workers/a queue system, distributed execution, real-time
event push (SSE/WebSocket), upstream `AbortSignal` support for true
mid-stage cancellation, upstream pre-fetched-context parameters to
eliminate redundant recompute, and telemetry-based stage weighting once
real duration data exists. Nothing in this implementation forecloses any
of these — the event model in particular was built specifically so a
real-time push layer is an additive subscriber, not a redesign.
