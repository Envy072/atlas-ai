# Atlas AI — Milestone 14 Design Specification

**Application Integration: Wiring the Completed Backend Into the Real Product**

Status: **Design only. No code, no folders, no source files exist yet.**
This document is the complete architecture and design specification for
Milestone 14, written for review before any implementation begins.
Nothing described here has been built.

Milestones 4–13 (`lib/research/` through `lib/verification/`) are frozen.
This milestone is additive at the application layer only — it introduces
new routes, one new service, one new hook, one new store, and new
presentational components. It does not add, modify, or redesign anything
inside `lib/research/`, `lib/competitors/`, `lib/market/`, `lib/financial/`,
`lib/business/`, `lib/decision/`, `lib/pipeline/`, `lib/analysis-session/`,
or `lib/verification/`.

**Architecture and current state reviewed before proposing this design:**
`lib/pipeline/`, `lib/analysis-session/`, `lib/verification/` (their public
barrels and schemas), `EXECUTION_PIPELINE.md`, `ANALYSIS_SESSION.md`,
`VERIFICATION.md`, `ARCHITECTURE.md`, `ARCHITECTURE_REVIEW.md`,
`PRODUCT_BACKLOG.md`, the roadmap review approved before this milestone,
and — critically — the **actual current live application code**:
`app/api/chat/route.ts`, `hooks/useAnalyzeStartup.ts`,
`lib/http/apiClient.ts`, `app/dashboard/page.tsx`,
`app/dashboard/analysis/page.tsx`, `components/dashboard/AIWorkspace.tsx`
and its children (`IdeaCommandCenter`, `AIThinkingExperience`,
`AnalysisReport` and its `report/` section components,
`ReportHistoryPanel`), and `PIPELINE.md` / `lib/analysis/` (see "A Second,
Unrelated Pipeline" below — this took direct inspection, not
recollection, since `ARCHITECTURE.md` is confirmed stale).

---

## 1. Purpose

Milestones 4–13 built a complete, frozen, independently-verified backend:
six knowledge platforms, Decision Intelligence, an Execution Pipeline, an
Analysis Session layer, and a Verification layer. None of it is reachable
by a real user today. Direct inspection of the live application confirms
this precisely:

```
app/api/chat/route.ts
  → analyzeStartup()          lib/services/analysis.ts   (legacy, Sprint 2/3)
      → generateStartupAnalysis()   lib/services/openai.ts   (one GPT call)
  → createProject()            lib/services/projects.ts   (Supabase)
```

Zero files under `app/`, `components/`, `hooks/`, or `lib/services/`
import from any of `lib/research`, `lib/competitors`, `lib/market`,
`lib/financial`, `lib/business`, `lib/decision`, `lib/pipeline`,
`lib/analysis-session`, or `lib/verification` (grep-verified). This
milestone's purpose is narrow and specific: **replace the legacy
single-call flow with the real pipeline, and build the minimum UI needed
to make Session progress, Timeline, and Verification's evidence/
confidence visible.** It adds no new intelligence and improves nothing
about analysis quality — it reveals what Milestones 4–13 already built.

### A second, unrelated pipeline (explicitly out of scope)

`PIPELINE.md` documents `lib/analysis/` — a separate, pre-existing,
eleven-stage *OpenAI-calling* decomposition of the original single GPT
call, built before the six-platform architecture existed. It produces the
same legacy `AnalysisResult` shape, calls OpenAI directly (not
`lib/research`/`lib/decision`), and is — per its own documentation —
"built, not yet live," with its own separate, still-open cutover
decision. **This milestone does not touch, cut over, or decide the fate
of `lib/analysis/`.** It targets a different, unrelated integration
question (fewer GPT calls vs. one) than this milestone's charter (real
sourced/evidenced intelligence vs. none). Conflating the two would be a
scope error. See Non-Goals.

---

## 2. Product Vision

> Atlas AI should look, to a user, exactly as sophisticated as it already
> is on disk.

Today there is a large gap between what Atlas AI's architecture can do
(stage-by-stage observability, real sourcing, evidence-backed claims, a
four-dimension confidence breakdown) and what a user experiences (one
blind wait, one opaque GPT-generated report, a `Loader2` spinner and a
fixed-timer fake stage list). This milestone closes that gap without
changing what the architecture *is* — it is the difference between an
engine that runs and a car a person can actually drive.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ UI (components/, app/dashboard/analysis)                            │
│  IdeaCommandCenter → SessionProgressExperience → DecisionReport      │
├──────────────────────────────────────────────────────────────────┤
│ Hook (hooks/useAnalysisSession.ts) + Store (lib/store/sessionStore) │
│  owns polling lifecycle, loading/error/status                        │
├──────────────────────────────────────────────────────────────────┤
│ API Client (lib/http/apiClient.ts) — reused, unchanged                │
├──────────────────────────────────────────────────────────────────┤
│ Routes (app/api/analysis-sessions/...) — thin controllers, new         │
├──────────────────────────────────────────────────────────────────┤
│ Service (lib/services/analysisSessions.ts) — new, orchestrates          │
│  ONLY lib/analysis-session + lib/verification's public barrels           │
├───────────────────────────────┬──────────────────────────────────┤
│ lib/analysis-session/ (M12)       │ lib/verification/ (M13)              │
│  PRESENTATION OWNER                 │  EXPLANATION OWNER                    │
│  — frozen, untouched                 │  — frozen, untouched                   │
├───────────────────────────────┴──────────────────────────────────┤
│ lib/pipeline/ (M11) — EXECUTION OWNER — frozen, untouched,               │
│  never called directly by this milestone's service or routes              │
├──────────────────────────────────────────────────────────────────┤
│ lib/decision/ (M10) — SOURCE OF SYNTHESIZED INTELLIGENCE —                 │
│  frozen, reached only through Session's `result.profile`                    │
├──────────────────────────────────────────────────────────────────┤
│ lib/research / competitors / market / financial / business — frozen         │
└──────────────────────────────────────────────────────────────────┘
```

Every box above the `lib/analysis-session` / `lib/verification` line is
new, application-layer, and this milestone's to build. Every box at or
below that line is frozen and untouched. The new service is the single
seam between them — it is the *only* new code permitted to import a
Milestone 4–13 module directly, and it may import only two: Session and
Verification.

---

## 4. Folder Structure

```
app/
  api/
    analysis-sessions/
      route.ts                    POST — start a new session
      [id]/
        route.ts                 GET  — poll current state + verification
        cancel/route.ts          POST — cancel (cooperative)
        retry/route.ts           POST — retry the current failed stage
        (resume and logs routes were cut during the complexity review —
         see Section 22: neither has a concrete UI consumer in this
         milestone's own scope. Both remain available directly on
         lib/analysis-session's public barrel for a future milestone
         that needs them.)

lib/
  services/
    analysisSessions.ts          new — the sole caller of lib/analysis-session
                                   and lib/verification from the application side
  schemas/
    analysisSessionView.ts       new — AnalysisSessionViewSchema, composed
                                   from AnalysisSessionSchema + VerificationSummarySchema
  store/
    sessionStore.ts              new — Zustand store for the live session view

hooks/
  useAnalysisSession.ts          new — replaces useAnalyzeStartup for the live flow
                                   (useAnalyzeStartup itself is untouched — see Risks)

components/
  workspace/
    session/
      SessionProgressExperience.tsx   new — real stage/percent AND the
                                        Timeline list in one component
                                        (merged during the complexity
                                        review — see Section 22), replaces
                                        AIThinkingExperience in the live flow
    decision-report/
      DecisionReport.tsx              new — top-level report for a completed
                                        session, replaces AnalysisReport in the live flow
      DecisionSummaryPanel.tsx        new — investmentThesis (positive/negative/
                                        unknowns/contradictions — no verdict, per
                                        lib/decision's own "no generated conclusion"
                                        rule) plus keyFindings + criticalRisks,
                                        merged into one panel (see Section 22)
      TrustPanel.tsx                    new — VerificationSummary: sources,
                                        sourceBreakdown, verifiedClaims,
                                        unverifiedStatements, confidence
```

`AIWorkspace.tsx` is modified (not redesigned architecturally — it keeps
its existing composition role) to call the new hook instead of
`useAnalyzeStartup`, and to mount the new session/decision-report
components instead of `AIThinkingExperience`/`AnalysisReport`.
`IdeaCommandCenter.tsx` gains a `onCancel`/`cancelling` prop path but is
otherwise unchanged. `ReportHistoryPanel.tsx` (Supabase-backed) is
untouched — see Non-Goals.

No new top-level `lib/` platform folder is introduced. This milestone
adds application glue, not a seventh knowledge platform.

---

## 5. Public APIs

```ts
// lib/services/analysisSessions.ts — the only new "service" surface.
// Every function below calls lib/analysis-session and, where a result
// exists, lib/verification — nothing else.

startAnalysisSession(input: CreateSessionInput): Promise<AnalysisSessionView>
getAnalysisSession(id: string): Promise<AnalysisSessionView | null>
cancelAnalysisSession(id: string): Promise<AnalysisSessionView>
retryAnalysisSession(id: string): Promise<AnalysisSessionView>
```

(`resumeAnalysisSession`/`getAnalysisSessionLogs` were cut — see Section
22's complexity review. Neither `resumeSession` nor `getLogs` has a
concrete caller anywhere in this milestone's own UI Mapping (Section 20);
both remain one-line additions to this same service whenever a future
milestone actually needs them.)

```ts
// lib/schemas/analysisSessionView.ts — one new composed schema, reusing
// two already-public schemas verbatim (never redefining either).
const AnalysisSessionViewSchema = z.object({
  session: AnalysisSessionSchema,          // from "@/lib/analysis-session"
  verification: VerificationSummarySchema.nullable(), // from "@/lib/verification"
});
type AnalysisSessionView = z.infer<typeof AnalysisSessionViewSchema>;
```

`verification` is `null` until `session.state === "completed"` — it is
never a partially-built summary (mirrors `buildVerificationSummaryFromSession`'s
own null-until-complete contract, unchanged).

```ts
// hooks/useAnalysisSession.ts
interface UseAnalysisSessionResult {
  view: AnalysisSessionView | null;
  status: "idle" | "starting" | "polling" | "error";
  error: string | null;
  start: (startupIdea: string, title?: string) => Promise<void>;
  cancel: () => Promise<void>;
  retry: () => Promise<void>;
}
```

No new export appears anywhere that isn't called by something in this
milestone's own request lifecycle — see Complexity Review.

---

## 6. Data Flow

```
User types idea, clicks Analyze
        │
        ▼
useAnalysisSession().start(idea)
        │  POST /api/analysis-sessions  { startupIdea }
        ▼
app/api/analysis-sessions/route.ts
        │  parseOrThrow(CreateSessionInputSchema, body)      [reused, unchanged]
        ▼
lib/services/analysisSessions.ts → startAnalysisSession(input)
        │  createSession(input)                               lib/analysis-session (M12)
        │      → startPipeline({ startupIdea })                lib/pipeline (M11)
        │          → stages run sequentially in the background    lib/research…lib/decision
        │  verification = null (session.result is undefined yet)
        ▼
AnalysisSessionView { session, verification: null }
        │  jsonSuccess(view)                                    [reused, unchanged]
        ▼
Hook stores view in lib/store/sessionStore, status="polling",
begins a fixed-interval GET poll of /api/analysis-sessions/:id
        │
        │  … time passes, stages complete one at a time …
        ▼
GET /api/analysis-sessions/:id  (repeated)
        → getAnalysisSession(id)
            → getSession(id)                                    lib/analysis-session (M12)
            → if session.state === "completed":
                  buildVerificationSummaryFromSession(session)   lib/verification (M13)
              else: verification = null
        ▼
AnalysisSessionView { session, verification }
        │
        ▼
Hook updates the store on every poll; UI re-renders from
session.progress / session.timeline / session.state / verification
        │
        ▼
Once session.state is terminal ("completed" | "cancelled" | "failed"),
polling stops.
```

Every arrow above either calls an existing public function unchanged or
performs a direct pass-through composition — no new business logic is
introduced anywhere in this chain.

---

## 7. Request Lifecycle

### 7.1 Starting a session

```
UI                Hook              Route                     Service                  lib/analysis-session   lib/pipeline
 │  click Analyze   │                  │                          │                          │                     │
 │─────────────────▶│                  │                          │                          │                     │
 │                  │  POST /api/…     │                          │                          │                     │
 │                  │─────────────────▶│                          │                          │                     │
 │                  │                  │  startAnalysisSession()  │                          │                     │
 │                  │                  │─────────────────────────▶│                          │                     │
 │                  │                  │                          │  createSession(input)     │                     │
 │                  │                  │                          │─────────────────────────▶│                     │
 │                  │                  │                          │                          │  startPipeline()     │
 │                  │                  │                          │                          │────────────────────▶│
 │                  │                  │                          │                          │◀────────────────────│
 │                  │                  │                          │◀─────────────────────────│ AnalysisSession      │
 │                  │                  │◀─────────────────────────│ {session, verification:null}                   │
 │                  │◀─────────────────│ 200 jsonSuccess(view)    │                          │                     │
 │◀─────────────────│ status="polling" │                          │                          │                     │
```

### 7.2 Progress updates (polling)

The hook polls `GET /api/analysis-sessions/:id` on a fixed interval
(implementation detail, not architecture — e.g. every 1.5–2s) while
`status === "polling"`. Each response carries `session.progress`
(Pipeline's own `ProgressSnapshot`, unchanged), `session.timeline`
(Session's own curated Timeline, unchanged), and `session.state`. The UI
renders these directly — no new progress math is computed anywhere in
the application layer; `formatProgress()` (already exported from
`lib/analysis-session`) is reused as-is for the human-readable label.

Streaming (Server-Sent Events, WebSockets, or `subscribeToSession`'s
in-process event API exposed over a network transport) is deliberately
not part of this milestone — see Non-Goals. Polling is the simplest
mechanism that satisfies "expose real progress," and `CLAUDE.md`'s own
Performance Rules already name streaming as a distinct, future concern.

### 7.3 Cancellation flow

Pipeline cancellation is **cooperative and stage-boundary-only** (M11) —
this milestone's UI must represent that faithfully, not paper over it:

```
UI: click Cancel
  → hook.cancel() → POST /api/analysis-sessions/:id/cancel
      → cancelAnalysisSession(id) → cancelSession(id)  [lib/analysis-session]
          → cancelPipeline(executionId)                 [lib/pipeline]
              → state becomes "cancelling" immediately
  ← response: session.state === "cancelling"
UI shows "Cancelling…" (not "Cancelled") — polling continues
  → next poll(s) eventually return state === "cancelled"
    once the in-flight stage reaches its boundary
UI shows "Cancelled" — polling stops
```

A UI that shows "Cancelled" the instant the button is clicked would be
dishonest about what actually happened — this is the same "never fabricate"
discipline every prior milestone held, applied to a loading state instead
of a data field.

### 7.4 Retry flow

```
UI: click Retry (shown only when session.state === "needs_attention")
  → hook.retry() → POST /api/analysis-sessions/:id/retry
      → retryAnalysisSession(id) → retrySession(id)   [lib/analysis-session]
          → retryStage(executionId)                    [lib/pipeline]
              → only the current failed stage re-runs — not the whole pipeline
  ← response: session.state === "analyzing" (or "needs_attention" again, on repeat failure)
UI resumes polling from status="polling"
```

### 7.5 Error propagation

Every route in this milestone reuses the exact same `AppError` →
`jsonError` mapping every existing route already uses (`lib/api/response.ts`,
unchanged). `getAnalysisSession`/`cancelAnalysisSession`/etc. propagate
`InvalidRequestError` for an unknown session id exactly as
`lib/analysis-session`'s own `loadRecordOrThrow` already throws it — no
new error type, no new mapping logic. The hook's `error` field surfaces
`getErrorMessage(err)` (already exported from `lib/errors`), matching
`useAnalyzeStartup`'s own existing pattern.

### 7.6 Loading states

- `status === "idle"` — no session started yet; UI shows the empty state
  (unchanged from today's `EmptyState` usage in `AIWorkspace`).
- `status === "starting"` — the initial POST is in flight; UI disables
  the input, matching `AnalyzeButtonLabel`'s existing loading treatment.
- `status === "polling"` — a session exists and isn't terminal;
  `SessionProgressExperience` renders real stage/percent/timeline.
- `status === "error"` — the POST or a poll failed at the network/route
  level (not a pipeline-internal failure, which instead surfaces as
  `session.state === "needs_attention"` with a real retry affordance).

### 7.7 Session lifecycle (state → UI mapping)

| `session.state` | UI treatment |
|---|---|
| `starting` | "Starting analysis…" |
| `analyzing` | `SessionProgressExperience` — real stage name, percent, timeline |
| `waiting_retry` | "Retrying automatically…" (an auto-retry is in flight, no user action needed) |
| `needs_attention` | A visible Retry action; the Timeline shows exactly which stage failed |
| `cancelling` | "Cancelling…" — see 7.3 |
| `completed` | `DecisionReport` renders — Thesis/Findings/Trust panels |
| `cancelled` | "Analysis cancelled." with a Restart affordance |
| `failed` | The error state, with the failure's message from the Timeline/Logs |

### 7.8 UI update flow

The hook is the only thing that writes to `lib/store/sessionStore`; every
component reads via a per-field selector (`useSessionStore((s) => s.view)`,
never whole-store destructuring — `CLAUDE.md` Section 7, unchanged rule).
`AIWorkspace` composes `IdeaCommandCenter` (input) →
`SessionProgressExperience` (while not terminal) → `DecisionReport` (once
completed), exactly mirroring today's `IdeaCommandCenter` →
`AIThinkingExperience` → `AnalysisReport` composition shape, so the
*structure* of `AIWorkspace` is preserved — only *what fills each slot*
changes.

---

## 8. Integration Boundaries

- **Routes call the new service only.** No route imports `lib/analysis-session`,
  `lib/pipeline`, `lib/decision`, or `lib/verification` directly.
- **The new service calls `lib/analysis-session` and `lib/verification`
  only** — both via their public barrels (`"@/lib/analysis-session"`,
  `"@/lib/verification"`). It never imports `lib/pipeline` (Session already
  wraps Pipeline — calling Pipeline directly would duplicate orchestration
  Session already owns) and never imports `lib/decision` (the
  `DecisionProfile` type is reached structurally through
  `session.result.profile`, which TypeScript infers from
  `AnalysisSession`'s own exported type — no explicit `lib/decision`
  import is needed anywhere in the new service).
- **No completed milestone is imported from a deep path.** Every import
  from Milestones 4–13 goes through that module's `index.ts` — grep-
  verified the same way every prior milestone's completion report has
  been.
- **No frozen module ever imports from the application layer.** The DAG
  gains new nodes above `lib/analysis-session`/`lib/verification`; nothing
  below that line ever points back upward.
- **`lib/pipeline` remains the sole execution owner** — no application
  code starts, cancels, or retries a `PipelineExecution` directly;
  everything routes through Session's own lifecycle functions.
- **`lib/analysis-session` remains the sole presentation owner** —
  `session.progress`/`.timeline`/`.state` are rendered as-is; the
  application layer computes no new progress or timeline logic of its own.
- **`lib/verification` remains the sole explanation owner** — sources,
  evidence, and confidence are rendered exactly as `VerificationSummary`
  shapes them; the application layer performs no new verified/unverified
  classification of its own.
- **`lib/decision` remains the sole source of synthesized intelligence** —
  `DecisionProfile`'s thesis/findings/risks are rendered as-is through
  `session.result.profile`; the application layer synthesizes nothing new.

---

## 9. User Journey

**Before Milestone 14:**
A user types an idea and clicks Analyze. One HTTP request blocks for the
duration of a single GPT call. While waiting, `AIThinkingExperience` shows
a fixed-timer animation cycling through stage *names* that don't
correspond to anything really happening — its own code comments this
honestly: "there is no real per-stage completion signal to report today."
When the request resolves, `AnalysisReport` renders once: a score,
verdict, and prose sections from one `AnalysisResult` object. There is no
sourcing, no evidence, no confidence breakdown, no way to cancel, and no
way to retry a specific failure — a transient error means starting over
from nothing.

**After Milestone 14:**
The same click starts a real `AnalysisSession`. The UI shows genuinely
live stage progress (Research → Competitors → Market → Financial →
Business → Decision), a real percentage, and a timeline of exactly what
completed and when. If a stage fails, the user sees exactly which one and
can retry only that stage. If the user cancels, the UI honestly shows
"Cancelling…" until the in-flight stage boundary is reached, then
"Cancelled." Once complete, the user sees the actual `DecisionProfile` —
its investment thesis material, findings, and risks — alongside a Trust
panel: real sources, per-claim evidence, and a four-dimension confidence
breakdown, none of which existed in the UI before this milestone even
though the data has existed since Milestones 10 and 13.

**Exactly what changes for the user:**
1. The wait becomes observable instead of blind.
2. Cancel and per-stage retry exist for the first time.
3. Sourcing, evidence, and confidence become visible for the first time.
4. The synthesized business intelligence itself (thesis/findings/risk
   narrative) may currently be **thinner** than today's GPT-generated
   report, because `lib/decision`'s finding/risk derivation is still an
   architecture-only placeholder and no search-provider credentials are
   configured in this environment — this is a known, accepted, temporary
   trade-off this milestone does not attempt to fix (see Risks).

---

## 10. Product Impact

**What users finally see:** real stage-by-stage progress, a real
timeline, real sources, real per-claim evidence, and a real
four-dimension confidence breakdown — all computed since Milestones
10–13, all invisible until now.

**What hidden capabilities become visible:** the entire six-platform
knowledge stack, Decision Intelligence's synthesis, the Execution
Pipeline's observability, Analysis Session's lifecycle model, and
Verification's trust/evidence view — nine modules, previously reachable
only by a scratch page and a curl command, now reachable by an actual
user clicking Analyze.

**Which `PRODUCT_BACKLOG.md` items become visibly solved:**

| Backlog item | Solved by this milestone? |
|---|---|
| "Cannot see the current analysis stage." | Yes — `session.progress`/timeline render the real current stage. |
| "Cannot see how much analysis remains." | Yes — `session.progress` (Pipeline's real `ProgressSnapshot`). |
| "No progress timeline." | Yes — `session.timeline`, rendered directly. |
| "Cannot cancel analysis." | Yes — the cancellation flow (7.3). |
| "Cannot restart a single stage." | Yes — the retry flow (7.4). |
| "No clear execution flow." | Yes — the state → UI mapping (7.7). |
| "Sources are not visible." | Yes — `VerificationSummary.sources`. |
| "Facts are not clearly referenced." | Yes — `VerifiedClaim.evidence` per finding/risk. |
| "Confidence is difficult to trust." | Yes — the four-dimension `DecisionConfidence` breakdown. |
| "Unclear which information is verified versus inferred." | Yes — `verifiedClaims` vs. `unverifiedStatements`. |
| Competitor/Market/Financial depth, Startup Builder | **No** — unaffected; these remain Milestones 16–20 per the approved roadmap. |

Both remaining Priority 1 categories this backlog names — **Analysis
Experience** and **Trust & Evidence** — become visibly solved by this one
milestone, at the cost of zero new intelligence.

---

## 11. User Questions Answered

| Question | Answered by |
|---|---|
| "What is Atlas AI doing right now?" | `session.state` + `session.progress`, rendered live. |
| "How much longer will this take?" | `progress.estimatedRemainingMs`, via `formatProgress()`. |
| "What already finished?" | `session.timeline`. |
| "Can I stop this?" | Yes — the cancellation flow; honestly labeled while cooperative. |
| "Something failed — do I have to start over?" | No — the retry flow retries only the failed stage. |
| "Where did this information come from?" | `VerificationSummary.sources` / `verifiedClaims[].evidence`. |
| "How much of this can I trust?" | The four-dimension confidence breakdown, unchanged from `lib/decision`. |
| "What's assumed vs. confirmed?" | `verifiedClaims` vs. `unverifiedStatements`. |

---

## 12. Success Metrics

- **Pipeline progress visible** — a real, live-updating stage name and
  percentage render during an in-flight analysis.
- **Session visible** — `session.state` drives the UI's loading/error/
  complete treatment end to end (7.7).
- **Timeline visible** — `session.timeline` renders as a real list of
  what happened and when, not a fixed-timer animation.
- **Verification visible** — a Trust panel renders once a session
  completes, sourced entirely from `VerificationSummary`.
- **Evidence visible** — every rendered finding/risk shows its backing
  `Evidence[]` (or is honestly absent when none exists).
- **Confidence visible** — all four `DecisionConfidence` dimensions
  render, not a single collapsed number.
- **Legacy analysis flow removed from the user path** — `/dashboard/analysis`
  no longer calls `useAnalyzeStartup`/`/api/chat` on the golden path;
  `/api/chat` itself may remain in the codebase (see Non-Goals) but is no
  longer reachable from any live UI component.
- **Cancellation and retry are both exercised successfully** against a
  real, running session during verification, not only asserted against a
  hand-seeded fixture.

---

## 13. Exit Criteria

1. Starting an analysis from the real `/dashboard/analysis` UI creates a
   real `AnalysisSession` (verified: the session id returned by the route
   corresponds to a real, independently-fetchable session).
2. Live progress, stage name, and timeline update over real wall-clock
   time without a page refresh.
3. Cancelling an in-flight session transitions it through `cancelling` →
   `cancelled`, both states visibly distinct in the UI.
4. Retrying a `needs_attention` session re-runs only the failed stage
   (verified: earlier stages' timeline entries are untouched by the
   retry).
5. A completed session's UI shows `VerificationSummary`'s sources,
   verified/unverified claims, and four-dimension confidence — all traced
   back to the same values `buildVerificationSummary` would produce from
   that session's own `DecisionProfile`.
6. No component under `app/dashboard/analysis` calls `useAnalyzeStartup`
   or `postJSON("/api/chat", ...)` any longer.
7. `tsc --noEmit`, `eslint`, and `next build` all pass with zero new
   errors.
8. `git status --short` shows only new/modified application-layer files —
   no file under `lib/research/` through `lib/verification/` is touched.
9. Nothing committed until explicitly requested.

---

## 14. Non-Goals

- Does not improve intelligence quality, scoring, or synthesis — every
  field rendered is exactly what `lib/decision`/`lib/verification` already
  produce today, placeholders included.
- Does not add real search-provider credentials or change what data is
  available to `lib/research`.
- Does not build Startup Builder (Milestone 20) or deepen Competitor/
  Market/Financial Intelligence (Milestones 16–18).
- Does not redesign `lib/pipeline`, `lib/analysis-session`,
  `lib/verification`, or `lib/decision` — every one of them is called
  exactly as its own public API already contracts.
- Does not touch, cut over, or make a decision about `lib/analysis/`'s
  separate eleven-stage OpenAI pipeline (`PIPELINE.md`) — an unrelated,
  still-open question this milestone does not resolve.
- Does not add streaming (SSE/WebSocket) — polling is the deliberate,
  simplest mechanism for this milestone; streaming remains a distinct,
  already-named future concern (`CLAUDE.md`'s Performance Rules).
- Does not reconcile Session history with the Supabase `projects` table.
  `/projects` and `ReportHistoryPanel` keep reading the existing
  `projects` table, unchanged; new sessions are not written there. This
  is a real, named gap (see Risks), not an oversight.
- Does not build a session history/list UI. `listSessions()` already
  exists in `lib/analysis-session`'s public barrel if a future milestone
  wants it; this one only needs a single in-flight session.
- Does not delete `lib/services/openai.ts`, `lib/services/analysis.ts`,
  `hooks/useAnalyzeStartup.ts`, `lib/store/analysisStore.ts`, or the
  orphaned `components/dashboard/DashboardShell.tsx` →
  `components/workspace/Workspace.tsx` tree. All become unused by the
  live path but are left in place, per `CLAUDE.md`'s "no dead-code
  deletion without explicit sign-off" — a future, explicitly-authorized
  cleanup milestone's job, not this one's.
- Does not add authentication, billing, or any account model.

---

## 15. Relationship to Milestone 11 (Execution Pipeline)

Pipeline remains the sole execution owner. This milestone's service never
imports `lib/pipeline` — it reaches Pipeline's guarantees (sequential
stages, cooperative cancellation, per-stage retry, checkpoint-based
resume) exclusively through `lib/analysis-session`'s own wrapping of them.
The cooperative, stage-boundary-only cancellation semantics Pipeline
established are surfaced honestly in the UI (7.3) rather than
approximated or hidden.

## 16. Relationship to Milestone 12 (Analysis Session)

Analysis Session becomes this milestone's primary integration point —
the new service calls `createSession`/`getSession`/`cancelSession`/
`retrySession` directly and exclusively for anything execution-,
timeline-, or progress-related (`resumeSession`/`getLogs` remain
available on the same public barrel but are not called by this
milestone's scope — see Section 22). Session's own
state-projection vocabulary (`starting`/`analyzing`/`waiting_retry`/
`needs_attention`/`cancelling`/`completed`/`cancelled`/`failed`) becomes
the UI's state vocabulary verbatim (7.7) — this milestone introduces no
second state model.

## 17. Relationship to Milestone 13 (Verification)

Verification becomes the sole source of the Trust panel. The new service
calls `buildVerificationSummaryFromSession(session)` directly — never
touches `DecisionProfile.sources`/`.evidence`/`.confidenceSummary` itself,
never re-implements the verified/unverified classification rule. The
`null`-until-`completed` contract `buildVerificationSummaryFromSession`
already defines is passed through unchanged into `AnalysisSessionView`.

---

## 18. Risks

- **Intelligence-quality trade-off, not a regression to hide.** Today's
  live flow calls GPT-4.1-mini with the adversarial Atlas system prompt
  and returns a full, real, generated `AnalysisResult` — a score, verdict,
  strengths/weaknesses/risks/opportunities. The new `DecisionProfile`'s
  `keyFindings`/`criticalRisks`/`investmentThesis` are, in this
  environment (no search-provider credentials, `deriveFindings`/
  `deriveCriticalRisks` still architecture-only per `MILESTONE_13_DESIGN.md`'s
  own Risks section), often thin or empty. This milestone makes the
  *process* and the *trust layer* visible for the first time, while the
  *synthesized intelligence itself* may look sparser than today's GPT-
  generated report until Milestones 16–18 add real depth. This is an
  explicit, accepted, temporary trade-off this milestone's own charter
  ("not about improving intelligence quality") requires — flagged here so
  it is never mistaken for a bug during review or a demo.
- **Wall-clock risk.** Six sequential stages take longer than one GPT
  call. The entire premise of this milestone is that visible progress
  makes that wait tolerable — worth confirming with a real measured
  elapsed time during implementation, not just asserted.
- **Polling cost.** A fixed-interval poll per active session is fine at
  today's scale and matches `CLAUDE.md`'s own "measure before optimizing"
  rule; it is not meant to scale indefinitely — streaming is the named
  future path (Non-Goals), not this milestone's problem.
- **Orphaned legacy code grows by one more layer.** `services/openai.ts`/
  `services/analysis.ts`/`useAnalyzeStartup`/`analysisStore`/the
  `DashboardShell` tree all become unused by the live path (Non-Goals) —
  correctly not deleted here, but worth naming as a compounding cleanup
  debt for a future, explicitly-authorized milestone.
- **History discontinuity.** A user's new analyses won't appear in
  `/projects`/`ReportHistoryPanel` (Supabase-backed) until a future
  milestone bridges Session history into that table or replaces it —
  named explicitly rather than silently accepted.
- **`lib/analysis/` confusion risk.** Because `PIPELINE.md` describes a
  different, real, callable pipeline that also targets `/api/chat`, an
  implementer skimming the codebase could conflate it with this
  milestone's actual target (`lib/pipeline`/M11). Section 1's explicit
  callout exists specifically to prevent that mistake.

---

## 19. Cutover Strategy

**What remains unchanged.** Every frozen module (`lib/research/` through
`lib/verification/`), `lib/api/response.ts`, `lib/http/apiClient.ts`,
`lib/errors/`, `lib/validation/parse.ts`, the Supabase `projects` table,
`app/projects/page.tsx`, `ReportHistoryPanel`, and `IdeaCommandCenter`'s
core input UI. `app/api/chat/route.ts`, `lib/services/analysis.ts`, and
`lib/services/openai.ts` are also left physically in place — untouched,
still technically callable — they simply stop being called by the live
UI.

**What becomes deprecated (unused, not deleted).** `hooks/useAnalyzeStartup.ts`,
`lib/store/analysisStore.ts`, `components/dashboard/AIThinkingExperience.tsx`,
and `components/workspace/report/AnalysisReport.tsx` (plus its `report/`
section components) all become unreachable from the live path once
`AIWorkspace` is switched over. None are deleted in this milestone — per
`CLAUDE.md`'s "no dead-code deletion without explicit sign-off" — but
their deprecation is a direct, intended consequence of this cutover, not
an accident, and is recorded here so it isn't rediscovered as a surprise
later.

**What becomes the new execution path.** `AIWorkspace` → `useAnalysisSession`
→ `app/api/analysis-sessions/*` → `lib/services/analysisSessions.ts` →
`lib/analysis-session` → `lib/pipeline` → the six knowledge platforms →
`lib/decision`, with `lib/verification` layered in once a session
completes. This is the only path Section 6 (Data Flow) describes — there
is no dual-write, no parallel execution of both flows.

**Immediate or staged?** **Immediate, at the code level; single-milestone,
not phased across multiple milestones.** `AIWorkspace`'s data source is
swapped in one change, not gradually behind a runtime toggle. Two reasons
this is safe: (1) `CLAUDE.md`'s own engineering guidance is to change the
code directly rather than introduce a feature-flag/toggle mechanism that
doesn't otherwise exist in this stack; (2) there is no live paying-user
traffic today (Authentication/Billing are still unbuilt, per the approved
roadmap) — there is no audience a staged rollout would be protecting.
"Staged" in the sense of *scope*, not *rollout mechanism*, already
happened at the roadmap level: this milestone only wires the flow itself,
and deliberately leaves deeper intelligence (Milestones 16–18) and a
richer dashboard (Milestone 15) for later — see Non-Goals.

**Rollback plan.** Because nothing the new path depends on replaces or
deletes anything the old path depends on, rollback is a plain version-
control revert of the commit(s) that changed `AIWorkspace.tsx` (and its
composed children) — not a data migration. Concretely: reverting restores
`AIWorkspace`'s original `useAnalyzeStartup` wiring, and `/api/chat`,
`services/analysis.ts`, and `services/openai.ts` are still present and
still work, since they were never modified. The new `AnalysisSession`/
`PipelineExecution` state is in-memory only (M11/M12's own storage
design), so there is no persisted new-flow data to reconcile or clean up
on rollback, and the Supabase `projects` table was never touched by the
new path in either direction — rolling back loses nothing there.

---

## 20. UI Mapping

Every major existing UI component, mapped to its status after this
milestone and to which backend concept it now makes visible:

| Existing component | Status | Backend concept now visible through it |
|---|---|---|
| `IdeaCommandCenter` | Kept, extended with a Cancel affordance | Triggers `startAnalysisSession` — no new concept surfaced itself |
| `AIThinkingExperience` | **Replaced** by `SessionProgressExperience` | Pipeline (via Session's progress projection), Analysis Session (state/lifecycle), Timeline, Progress |
| `AnalysisReport` + `report/` sections | **Replaced** by `DecisionReport` | Decision (via `DecisionSummaryPanel`) |
| *(none previously existed)* | New: `TrustPanel` | Verification, Evidence, Confidence |
| `ReportHistoryPanel` | Kept, unchanged | Nothing new — still Supabase `projects` only (Non-Goals) |
| `AIWorkspace` | Modified composition root | Orchestrates all of the above via `useAnalysisSession` |

Explicit lookup for the eight concepts named in this milestone's mission:

| Backend concept | Where it becomes visible |
|---|---|
| **Pipeline** | `SessionProgressExperience`, indirectly — Pipeline is never rendered directly; it's visible only through Session's own projection of it (state, progress), per Section 8's boundary rule. |
| **Analysis Session** | `SessionProgressExperience` (state/lifecycle) and `AIWorkspace` (overall composition driven by `session.state`). |
| **Verification** | `TrustPanel`. |
| **Decision** | `DecisionSummaryPanel` (investment thesis material, findings, critical risks). |
| **Timeline** | `SessionProgressExperience` (merged in — see Section 22). |
| **Progress** | `SessionProgressExperience` (percent, current stage, `formatProgress()`'s estimated-remaining label). |
| **Evidence** | `TrustPanel` (`VerifiedClaim.evidence` per finding/risk). |
| **Confidence** | `TrustPanel` (the four-dimension `DecisionConfidence` breakdown). |

No backend concept from this milestone's mission is left without a named
UI home, and no UI home is invented for a concept that isn't in that list.

---

## 21. User Experience Transition

**What immediately improves:** the wait becomes observable (real stage,
real percent, real timeline) instead of blind; cancel and per-stage retry
exist for the first time; sources, per-claim evidence, and a four-
dimension confidence breakdown become visible for the first time. All of
this is a strict improvement over today — nothing about the *process*
experience gets worse.

**What temporarily becomes less complete than the legacy flow:** the
synthesized narrative itself. Today's single GPT-4.1-mini call, driven by
the adversarial Atlas system prompt, returns a full, dense, written
analysis — a real score, verdict, strengths/weaknesses/risks/
opportunities/next steps. The new `DecisionProfile`'s `investmentThesis`/
`keyFindings`/`criticalRisks` are, in this environment, often thin or
empty, because `lib/decision`'s finding/risk derivation is still an
architecture-only placeholder (M10) and no search-provider credentials
are configured, so `lib/research`'s own sourcing is sparse too. A user
completing an analysis right after this milestone ships will see a richer
Trust panel than ever before, wrapped around a thinner Decision summary
than they'd have gotten from the legacy flow yesterday.

**Why that trade-off is acceptable:** this milestone's explicit charter is
process and trust visibility, not intelligence quality — trading a denser
but completely unverifiable GPT narrative for a sparser but fully sourced
and evidence-backed one is a deliberate bet that trust matters more than
density right now, which is exactly what `PRODUCT_BACKLOG.md`'s own
Priority 1 "Trust & Evidence" section (not "Content Depth") asked for.
There is also no real cost to being wrong about this bet: there is no
paying-user traffic yet (Section 19), and rollback is a plain revert with
no data migration.

**Which future milestones resolve it:** Milestones 16, 17, and 18
(Competitor, Market, and Financial Intelligence Depth, in that order per
the approved roadmap) directly deepen `DecisionProfile`'s own inputs,
which flow straight through into a richer Decision summary and a fuller
Trust panel with zero further changes to this milestone's own code —
exactly the "automatic enrichment" future extension point
`VERIFICATION.md` already names. Configuring real search-provider
credentials (an operational change, not a milestone) would also
immediately deepen sourcing without any code change at all.

---

## 22. Complexity Review

This section was re-run in full for this revision, not only appended to —
every abstraction below was re-checked against "does this have a concrete
consumer in this milestone's own UI Mapping (Section 20)?", not just
"might this be useful eventually."

- **`resume` and `logs` cut from this milestone's scope entirely.** The
  original draft proposed a `resume` route/service function and a `logs`
  route/service function to mirror `lib/analysis-session`'s full public
  API. Neither has a concrete caller anywhere in Section 20's UI Mapping —
  no component in this design shows a "Resume" affordance or a verbose
  log viewer. Carrying them anyway would have been exactly the
  "theoretical future use" this review is required to remove. Both
  functions remain one import away on `lib/analysis-session`'s own barrel
  whenever a future milestone (most likely Dashboard UX, M15, for logs)
  actually needs them — cutting them here costs nothing later.
- **Timeline merged into the progress component, not a separate panel.**
  The original draft proposed `SessionTimelinePanel.tsx` as its own file
  alongside `SessionProgressExperience.tsx`. Both read the same `session`
  object and are always shown together (there is no scenario in this
  milestone's UI Mapping where progress renders without the timeline or
  vice versa) — splitting them into two files bought no real separation
  of concern, only two places to keep in sync. Merged into one component.
- **Thesis and Findings merged into one Decision panel.** The original
  draft proposed `ThesisPanel.tsx` and `FindingsPanel.tsx` as separate
  files. Both render different slices of the same `DecisionProfile` with
  no independent lifecycle or reason to mount one without the other —
  merged into `DecisionSummaryPanel.tsx`. `TrustPanel` stays genuinely
  separate, because it renders a different object entirely
  (`VerificationSummary`, not `DecisionProfile`) — this mirrors the real
  architectural boundary between Decision and Verification (Sections 16–17),
  not an arbitrary UI grouping.
- **One new service file, not several.** `lib/services/analysisSessions.ts`
  holds all six functions — each is a thin delegation plus, where
  relevant, one `buildVerificationSummaryFromSession` call. Splitting
  this into multiple files today would separate cohesive, jointly-tiny
  logic for no present benefit.
- **One new store, justified, not reflexive.** The live session view is
  genuinely read by multiple sibling components (`SessionProgressExperience`,
  `DecisionReport`'s panels) that don't have a direct parent-child
  relationship carrying the data — this is exactly the "shared across a
  subtree" case `CLAUDE.md` Section 7 requires before reaching for
  Zustand, not a reflexive default.
  Local component state was considered and rejected: `AIWorkspace` would
  otherwise have to prop-drill the session view through several
  layers, which Section 3 of `CLAUDE.md` already rules out.
- **Six routes, not one dynamic dispatcher.** A single route keyed by an
  action-type body field was considered and rejected — `CLAUDE.md`
  Section 13 explicitly forbids a `type`-switch handler serving multiple
  concerns; six small, single-purpose routes match the six single-purpose
  functions in the new service, one-to-one, and match the same shape
  every existing route in this codebase already takes.
- **No streaming, no event transport, no new dependency.** `subscribeToSession`
  already exists but is an in-process callback API; exposing it over the
  network would require SSE/WebSocket machinery this milestone does not
  need to satisfy its own success metrics. Polling with the existing
  `apiClient.postJSON`/a plain `fetch` for GET is sufficient, and no new
  package (no SWR, no React Query — neither is currently installed) is
  introduced to achieve it.
- **No generic "integration layer" abstraction beyond what's used.** The
  design was checked for the temptation to build a reusable
  "long-running-operation" hook/store abstraction generalized beyond
  Analysis Session. That abstraction has exactly one caller today
  (`AIWorkspace`) — introducing it now would be exactly the "theoretical
  future use" this review is required to remove. `useAnalysisSession`
  and `sessionStore` are named for what they actually are, not for a
  generalized pattern nothing yet needs.
- **`AnalysisSessionViewSchema` composes two schemas; it defines zero new
  fields.** Every field on it is `session` or `verification`, taken
  whole from their own already-public schemas — no new shape is invented
  at the application layer.

---

## Definition of Done

1. New routes exist exactly as specified in Section 4; each is a thin
   controller (parse/validate → call the new service → `jsonSuccess`/
   `jsonError`), matching every existing route's shape.
2. `lib/services/analysisSessions.ts` imports only from
   `"@/lib/analysis-session"` and `"@/lib/verification"` — grep-verified,
   zero deep imports, zero import of `lib/pipeline` or `lib/decision`.
3. `AnalysisSessionViewSchema` is the only new schema introduced at the
   application layer, composed entirely from existing public schemas.
4. `useAnalysisSession` drives `AIWorkspace`'s live flow end to end;
   `useAnalyzeStartup` is no longer called anywhere under
   `app/dashboard/analysis`.
5. The cancellation and retry flows behave exactly as Sections 7.3/7.4
   specify, verified against a real running session (not only a
   hand-seeded fixture).
6. A completed session's Trust panel values match what
   `buildVerificationSummary` would independently produce from the same
   session's `DecisionProfile`.
7. `tsc --noEmit`, `eslint`, and `next build` all pass with zero new
   errors (pre-existing, unrelated issues excluded).
8. `git status --short` touches only application-layer files — zero
   frozen `lib/` platform files modified (grep/status-verified).
9. Documentation (a new `APPLICATION_INTEGRATION.md`, matching the depth
   of `EXECUTION_PIPELINE.md`/`ANALYSIS_SESSION.md`/`VERIFICATION.md`) is
   written during implementation, including this design's own flagged
   trade-off (intelligence-quality thinness) and open gaps (history
   discontinuity, orphaned legacy code).
10. Nothing committed until explicitly requested.

---

*End of design specification. Awaiting review before any implementation
begins.*
