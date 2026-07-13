# Atlas AI — Milestone 26 Design Specification

**Project Persistence Architecture**

Status: **Approved. Implementation in progress.**

This is Phase 3's next milestone after Milestone 25 (legacy-flow
retirement). It closes the gap Milestone 25 explicitly named and
deliberately did not fix: *"a completed `DecisionProfile` is never
persisted as a `projects` row today... the projects list and history
panel are functionally always empty in any real deployment, regardless
of how many analyses a founder runs."* This document designs the fix.

**Post-approval addendum:** review added one binding architectural
requirement not fully made explicit in the original draft — the
persisted Project snapshot must be **immutable**. Reopening or
re-running an analysis must never silently overwrite a stored snapshot;
future project-update behavior, if any, belongs to a separate, later
milestone (tentatively Milestone 27) with its own explicit lifecycle
design. Sections 3.2, 3.5, 4, and 8 below were strengthened accordingly
— every write this milestone performs is a plain, insert-only operation
with zero `UPDATE`/`upsert` code paths, verified explicitly in Section
8's Definition of Done.

---

## Pre-Design Verification

Every claim below is a direct read of the current working tree performed
in this session, not a recollection of prior milestone documents.

### The live flow, traced end to end (confirmed unchanged since Milestone 25)

```
IdeaCommandCenter (types an idea)
  → useAnalysisSession.start() (hooks/useAnalysisSession.ts)
    → POST /api/analysis-sessions (app/api/analysis-sessions/route.ts)
      → startAnalysisSession() (lib/services/analysisSessions.ts)
        → createSession() (lib/analysis-session/lifecycle/sessionLifecycle.ts)
          → startPipeline() (lib/pipeline/) → six knowledge platforms
          → SessionRecord{id, executionId, title, startupIdea, createdAt,
            updatedAt} persisted via AnalysisSessionStore (defaults to
            MemoryAnalysisSessionStore — non-durable, lib/analysis-session/
            storage/createStore.ts)
      ← AnalysisSessionView{session, verification: null} (201)

useAnalysisSession polls GET /api/analysis-sessions/:id every 1750ms
  → getAnalysisSession() (lib/services/analysisSessions.ts)
    → getSession() composes SessionRecord + live PipelineExecution
    → buildVerificationSummaryFromSession()
  ← AnalysisSessionView, until session.state is terminal

On session.state === "completed":
  AIWorkspace renders DecisionReport(profile: session.result.profile,
    verification) — six cards, Milestone 24-cleaned.
  AIWorkspace also renders ReportHistoryPanel(projects), sourced from
  listProjects() (lib/services/projects.ts), fetched independently by
  app/dashboard/analysis/page.tsx.
```

**Confirmed: nothing in this live chain ever writes to the `projects`
table.** `createProject()` (the only function that ever wrote to it) was
removed at Milestone 25 — its sole caller was the now-deleted
`app/api/chat/route.ts`. `lib/services/projects.ts` today exports exactly
one function:

```ts
export async function listProjects(): Promise<ProjectRecord[]>
```

### Where Project data is currently expected — every call site, confirmed exhaustively

Six components/pages consume `ProjectRecord[]`, all reading the exact
same `listProjects()` result, fetched independently at two Server
Component boundaries (no shared cache, by design — Server Components
re-fetch per request):

| Consumer | Fields actually read |
|---|---|
| `app/dashboard/page.tsx` → `DashboardStats.tsx` | `score` (avg/max), `created_at` (this-week count), `projects.length` |
| `app/dashboard/page.tsx` → `RecentProjectsPanel.tsx` | `id`, `title`, `summary`, `score`, `created_at` |
| `app/dashboard/page.tsx` → `RecentActivityPanel.tsx` | `id`, `title`, `created_at` |
| `app/dashboard/analysis/page.tsx` → `AIWorkspace` → `ReportHistoryPanel.tsx` | `id`, `title`, `score`, `created_at` |
| `app/projects/page.tsx` | `id`, `title`, `score`, `summary`, `problem`, `solution`, `created_at` |

No other file anywhere imports `ProjectRecord` or calls `listProjects()`.
This is the complete, exhaustive consumer set — confirmed via grep
against all of `app/` and `components/`.

### The existing `ProjectRecord` shape — confirmed legacy-coupled, not compatible with today's data

```ts
export interface ProjectRecord {
  id: string;
  created_at: string;
  title: string | null;
  score: number | null;
  summary: string | null;
  problem: string | null;
  solution: string | null;
  [key: string]: unknown;
}
```

This shape mirrors the **deleted** `AnalysisResult` schema
(`problem`/`solution`/`score` were that schema's own fields — confirmed
by reading the Milestone 25 deletion list, which removed
`lib/schemas/analysis.ts` for exactly this reason). Today's live output,
`DecisionProfile` (`lib/decision/schemas/decision.schema.ts`), has **no
equivalent of any of `score`, `problem`, or `solution`** — confirmed by
reading the full schema:

- **No numeric score exists anywhere in the live pipeline.**
  `DecisionSummaryPanel.tsx`'s own code comment states this is
  deliberate: *"Deliberately shows no verdict/score:
  `investmentThesis` carries no conclusion field by its own design
  ('no generated conclusion')."* `InvestmentThesisSchema` itself is
  commented `"ARCHITECTURE ONLY. NO AI GENERATION. NO CONCLUSIONS."`
  `DecisionConfidenceSchema` tracks four data-quality dimensions
  (`evidenceConfidence`, `coverage`, `unknownPercentage`,
  `dataFreshnessDays`) but is explicitly documented as **not** a
  business-quality score: *"a business can be genuinely excellent with
  thin evidence, or genuinely weak with thorough evidence."*
- **No `problem`/`solution` fields exist.** The closest live
  equivalents are `businessSummary.customerProblem` and
  `businessSummary.valueProposition` (both optional strings, a real but
  materially different shape — a whole `DecisionProfile`, not a
  two-field pair).
- `title` and `created_at` map cleanly: `SessionRecord.title` already
  exists (defaults to the idea text) and `AnalysisSession.createdAt`
  already exists — both already schema-validated, nothing to invent.

**This is the single most consequential finding of this audit:** Project
persistence cannot be a pure plumbing exercise that reuses the existing
`ProjectRecord` shape unchanged. The underlying data model the product
generates has fundamentally changed since `ProjectRecord` was designed,
and three of its seven fields (`score`, `problem`, `solution`) have no
honest source of truth to populate them from today. Any design that
pretends otherwise would have to fabricate a score — the one thing this
entire codebase's architecture (every schema, every milestone's own
review) has consistently refused to do.

### The established "derived, not duplicated" persistence pattern already in this codebase

`SessionRecord`'s own schema comment states the precedent directly:
*"The lightweight record this layer actually persists — deliberately
small. Everything else about a session... is derived at read time from
the `PipelineExecution` it references, never stored a second time
(MILESTONE_12_DESIGN.md Section 10's 'derived, not duplicated' rule)."*
Every one of the six knowledge platforms (`lib/research` through
`lib/decision`) follows the same `storage/` + `createStore()` +
`MemoryXStore` (real) / `SupabaseXStore`/`PostgresXStore`/
`WarehouseXStore` (architecture-only, throw) pattern.

**Confirmed: none of these platform stores are durable today.**
`lib/analysis-session/storage/supabaseStore.ts`, read in full, is
architecture-only — every method throws
`"...is architecture only — no query is implemented yet."` The default
backend everywhere is `"memory"`. This means **a completed
`AnalysisSession`/`PipelineExecution` does not survive a server
restart** — the exact "zero durable persistence" debt
`ATLAS_AI_PHASE_3_REVIEW.md` Section 1.4/1.6 names as **High** severity,
independent of and prior to this milestone.

### Why this matters directly for this design

A Project record that stores only a *pointer* (`sessionId`) and relies on
re-reading the live session/pipeline store to reconstruct its content
would become a **dangling reference** the moment the process restarts,
since the thing it points to is memory-only. A durable Project cannot
depend on the session/pipeline layer's own durability, because that
layer has none yet. This is a real architectural constraint this design
must resolve explicitly (see Section 3 and Section 7), not an
implementation detail to discover later.

### `CLAUDE.md`'s own existing rule for this exact table

Section 8 (Services Rules) already states the governing rule, unchanged
by this milestone: *"Projects service (`projects.ts`) owns all
reads/writes to the Supabase `projects` table... Any new query against
this or a future table is added here, never inlined into a
page/component."* This milestone's entire job is to give that existing,
correct rule something real to do.

### Existing project services/models — reused, not duplicated

`lib/services/projects.ts` (`listProjects`, `ProjectRecord`) and
`lib/supabase.ts` (the one shared Supabase client) are the **only**
persistence surface this design touches or extends. No new `storage/`
folder, no new `createStore()` factory, and no second Supabase-calling
file are introduced — see Section 3 for why the six-platform pattern is
deliberately *not* copied here.

---

## 1. Current Data Flow

```
Founder submits idea
  → AnalysisSession created (in-memory SessionRecord + PipelineExecution)
  → Pipeline runs six knowledge platforms
  → DecisionProfile + VerificationSummary produced
  → Client polls until session.state === "completed"
  → DecisionReport renders the profile — directly from the in-memory
    session, never persisted anywhere

Independently, on every dashboard/projects page load:
  → listProjects() queries the Supabase `projects` table
  → Table has had nothing written to it since Milestone 25 (and before
    that, only ever received rows shaped like the now-deleted
    AnalysisResult, via the now-deleted /api/chat route)
  → Every consumer (Section "Pre-Design Verification") renders real code
    against a list that is, in any live deployment, empty
```

**The core problem, stated plainly:** the analysis flow and the
persistence flow are two disconnected systems today. One produces real,
rich, evidence-linked output every time a founder runs an analysis; the
other displays a project list that has no path by which that output
could ever arrive in it.

## 2. Desired Data Flow

```
Founder submits idea
  → AnalysisSession created (unchanged — this milestone does not touch
    lib/analysis-session or lib/pipeline)
  → Pipeline runs six knowledge platforms (unchanged)
  → DecisionProfile + VerificationSummary produced (unchanged)
  → Client polls until session.state === "completed" (unchanged)
  → DecisionReport renders the profile (unchanged)

  ALSO, the FIRST time any caller observes session.state === "completed"
  for a given session id (server-side, inside the one existing seam that
  already composes session views):
  → services/analysisSessions.getAnalysisSession() calls a new function,
    services/projects.persistProjectFromSession(view), after composing
    the view
  → persistProjectFromSession writes exactly one new `projects` row:
    a durable snapshot of {sessionId, executionId, title, createdAt,
    profile, verification}, idempotent per session id (Section 3/4)
  → Failure to persist is logged and swallowed, per this file's existing
    error-handling convention for createProject — a persistence hiccup
    must never fail the user-facing analysis response

Independently, on every dashboard/projects page load:
  → listProjects() queries the same `projects` table, now populated
  → Every existing consumer renders real, current rows — using the
    fields the new schema actually has (Section 6), not the ones the
    old, deleted AnalysisResult schema had
```

**What does not change:** `lib/analysis-session/`, `lib/pipeline/`, and
all six knowledge platforms remain completely unaware that "Projects" as
a user-facing concept exists — exactly as they are today. The one new
seam is entirely inside the application/services layer, the same layer
that already owns this responsibility per `CLAUDE.md` Section 8.

## 3. Required Architectural Changes

### 3.1 Where a Project is created — the one correct seam, and why

**`lib/services/analysisSessions.ts`'s private `toView()`**, the single
composition function every exported function in that file
(`startAnalysisSession`, `getAnalysisSession`, `cancelAnalysisSession`,
`retryAnalysisSession`) already funnels through — refined during
implementation from the original draft's narrower "inside
`getAnalysisSession()` only," since `toView()` is the true single seam
all four already share, and `persistProjectFromSession` is itself a
no-op unless `state === "completed"`, so calling it uniformly from every
entry point is strictly safer than special-casing just one of them (e.g.
a retry that happens to finish synchronously would otherwise be missed).
Concretely: after composing the `AnalysisSessionView`, `toView()` calls
`projects.persistProjectFromSession(view)` before returning it; the
function's own internal guard clause (state must be `"completed"`, both
`result` and `verification` must be present) makes every other call a
safe, cheap no-op.

**Why here, and not elsewhere:**

- **Not inside `lib/analysis-session` or `lib/pipeline`.** Both are
  orchestration layers with zero knowledge of "Projects," Supabase, or
  any persistence concern outside their own execution state — introducing
  that knowledge would violate the exact boundary
  `MILESTONE_12_DESIGN.md` established and every subsequent milestone
  has preserved.
- **Not inside the route handler
  (`app/api/analysis-sessions/[id]/route.ts`).** Routes are thin
  controllers (`CLAUDE.md` Section 13); a persistence side effect is
  business logic and belongs in a service, not a route.
- **Not client-triggered (e.g., the hook calling a new "save" endpoint
  once it observes `state === "completed"`).** A founder can close the
  tab, lose network, or never have the polling loop reach a terminal
  state in the browser at all; a client-triggered save would silently
  drop projects whenever that happens. Server-side, triggered by the
  same polling GET request that already runs regardless of which browser
  tab (if any) is watching, is the only trigger point that reliably fires
  exactly once per real completion — a second browser tab polling the
  same session, or the user returning to `/dashboard/analysis` later,
  all pass through this same seam.

**This is a read-triggering-a-write pattern, and that trade-off is named
explicitly, not hidden:** `GET /api/analysis-sessions/:id` gains a side
effect. This is unusual, and is justified only because (a) no background
job/worker/webhook infrastructure exists in this codebase to do it
otherwise (`CLAUDE.md` Section 21/22 confirm this is a known, deliberate
gap, not an oversight), and (b) the write is made safely idempotent
(Section 3.2), so the side effect is invisible to any caller and
produces no duplicate data even under concurrent polling from multiple
tabs.

### 3.2 Idempotency — required, not optional

Multiple browser tabs, or a single tab's own retry-after-error path, can
all poll the same completed session concurrently. `persistProjectFromSession`
must not create two rows for one session. **Mechanism: a unique
constraint on the `projects.session_id` column at the database level**,
with the insert's unique-violation error caught, logged at debug level,
and swallowed — not surfaced as a failure. This mirrors
`lib/services/projects.ts`'s own existing, established convention
(the old `createProject`, per its doc comment, already "logs and
swallows a failure rather than throwing... a persistence hiccup
shouldn't fail the user-facing response"). No new error-handling
philosophy is introduced; the existing one is applied to a new case.

An application-level "check then insert" (`SELECT ... WHERE session_id`,
then `INSERT` only if absent) is explicitly **rejected** as the primary
mechanism — it has a race window between the check and the insert under
true concurrency, and would only be a partial fix layered on top of the
same DB constraint anyway. The constraint is the actual guarantee; an
optional pre-check is a reasonable optimization to skip a redundant
write attempt, not a substitute for it.

**Immutability requirement (added after review): the write must be a
plain `INSERT`, never an `upsert`.** `persistProjectFromSession` calls
Supabase's `.insert()` only — `.upsert()` (`INSERT ... ON CONFLICT (...)
DO UPDATE`) is explicitly forbidden for this table, because an upsert
would silently overwrite an existing snapshot the moment this function
is ever called again for the same `session_id`. Concretely, this
function *will* be called more than once for the same completed session
in ordinary operation — every subsequent poll of an already-completed
session (a second browser tab, a page refresh, a founder returning to
`/dashboard/analysis` later, a retried request) reaches this same code
path again. The unique-violation-and-swallow behavior (not an upsert)
is what makes every one of those repeat calls a safe no-op against the
original row, rather than a silent overwrite. **No code path introduced
by this milestone ever performs an `UPDATE` or `upsert` against an
existing `projects` row — insert-or-swallow is the only write operation
this service performs.**

**"Reopening" vs. "re-running," stated precisely, since both must be
safe but for different reasons:**

- **Reopening** an already-completed session (re-polling it, viewing it
  in a second tab, returning to it later) reuses the same `sessionId` —
  handled by the insert-or-swallow guarantee above: the original row is
  read back unchanged, never touched.
- **Re-running** the same idea (the founder starts a brand-new analysis,
  identical or not) always produces a brand-new `sessionId` from
  `createSession()` — an entirely independent `AnalysisSession`, whose
  own eventual completion, if any, persists as an entirely separate,
  additional `projects` row. There is no code path by which starting a
  new analysis can locate, reference, or modify a prior session's
  already-persisted Project — the two are connected only in that a human
  reader might recognize them as "the same idea typed twice," never in
  the data model itself.

### 3.3 Data shape — snapshot, not pointer, and why

Two candidate designs were directly considered:

**Option A — Pointer.** Store only `{id, sessionId, executionId, title,
createdAt}`; reconstruct `DecisionProfile`/`VerificationSummary` at read
time by calling back into `lib/analysis-session`/`lib/pipeline`,
mirroring `SessionRecord`'s own "derived, not duplicated" philosophy
exactly.

**Option B — Snapshot.** Store `{id, sessionId, executionId, title,
createdAt, profile: DecisionProfile, verification: VerificationSummary}`
as a durable, immutable copy taken at the moment of first-observed
completion.

**Recommendation: Option B (snapshot).** Reasoning:

- **Option A is unsafe today, not just architecturally uglier.** The
  session/pipeline stores it would depend on are memory-only
  (Pre-Design Verification). A restart between "analysis completed" and
  "founder next visits `/projects`" would make every pointer-based
  Project silently unreadable — the exact opposite of what "persistence"
  is supposed to guarantee. Fixing this would require *first* wiring a
  durable `AnalysisSessionStore`/pipeline execution store — real,
  valuable work, but a distinct milestone (`ATLAS_AI_PHASE_3_REVIEW.md`
  Section 6, Theme A item 3), not something this milestone should be
  silently blocked on or silently duplicate.
- **A snapshot is not a duplicate data model, by this codebase's own
  established test.** `CLAUDE.md` Section 5 prohibits hand-duplicating a
  schema's *fields* into a second, independently-maintained type. A
  snapshot does the opposite: it stores the exact, unmodified output of
  `DecisionProfileSchema`/`VerificationSummarySchema`, validated against
  those same schemas on write (and, defensively, on read —
  `CLAUDE.md` Section 14's "always validate, even your own data"
  extends naturally to a value this service itself wrote earlier).
  Nothing about `DecisionProfile` is redefined, renamed, or given a
  second, competing shape.
  `MarketProfile`/`CompanyProfile` accumulation elsewhere in this
  codebase already stores a platform's full profile object directly in
  its own store for exactly this reason (see any `MemoryXStore`); this
  is the same discipline, applied to the one table that is genuinely a
  user-facing, cross-platform table rather than one platform's own
  internal store.
- **A snapshot is the semantically correct model for an investment
  memo, independent of the durability question.** If a founder re-runs
  the same idea next month and market conditions or provider output
  differ, the original Project should not silently change underneath a
  founder who already read and acted on it — a Project is a
  point-in-time record, not a live view. This matches how every real
  investment memo, due-diligence report, or accelerator evaluation
  works: it's dated and frozen, not live-recalculated.

### 3.4 Schema — composed, never hand-duplicated

```ts
// lib/schemas/project.ts (new file — the one new schema this
// milestone introduces)
export const ProjectSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  executionId: z.string(),
  title: z.string().min(1),
  createdAt: z.string(),
  ownerId: z.string().nullable(),   // reserved, unused until Authentication
  profile: DecisionProfileSchema,        // imported verbatim from lib/decision
  verification: VerificationSummarySchema, // imported verbatim from lib/verification
});
export type Project = z.infer<typeof ProjectSchema>;
```

Every field beyond the five new scalars (`id`, `sessionId`,
`executionId`, `ownerId`, and reused `title`/`createdAt` from
`SessionRecord`) is a direct, unmodified schema reuse — zero
hand-authored duplication, matching every prior milestone's own
schema-reuse discipline (e.g. `AnalysisSessionViewSchema`'s own doc
comment: *"composed entirely from two already-public schemas, never
redefining either"*).

### 3.5 Service layer changes — one file extended, nothing duplicated

`lib/services/projects.ts` gains:

```ts
export async function persistProjectFromSession(view: AnalysisSessionView): Promise<void>
```

- Guard clause: no-ops (returns immediately) unless
  `view.session.state === "completed"` and `view.verification !== null`
  — mirrors `AIWorkspace.tsx`'s own existing completion check, so the
  same "what counts as complete" definition is never redefined a second
  time.
- Builds a `Project` (validated against `ProjectSchema` before insert —
  `CLAUDE.md` Section 14), calls Supabase's `.insert()` — **never
  `.upsert()`** — catches a unique-constraint violation on `session_id`
  and swallows it (Section 3.2, immutability requirement), catches any
  other Supabase error and logs-and-swallows it (matching the existing
  `createProject`/`listProjects` convention byte-for-byte). This
  function contains no `UPDATE`/`upsert` branch of any kind — there is
  no code path inside it, today or added later without a new design, by
  which it could modify a row that already exists.
- `listProjects()` is updated to return `Project[]` (via the new schema)
  instead of the legacy `ProjectRecord[]` — **this is the one, single
  source of truth for what a "project" is**, replacing the old shape
  everywhere at once rather than maintaining both.

**No second persistence path is introduced anywhere.** Every write to
`projects` happens through this one function, in this one file, called
from exactly one seam. Every read happens through `listProjects()`,
unchanged in that respect from today.

### 3.6 Why the six-platform `createStore()`/`MemoryXStore` pattern is deliberately *not* reused here

Considered directly and rejected: the six knowledge platforms each need
a swappable storage backend because they have refresh/resolve/accumulate
semantics unique to that platform (`resolveMarketKnowledge()`,
`refreshEngine.ts`, etc.) and multiple environments (memory for
dev/tests, a future warehouse for production analytics). The `projects`
table has none of that shape — it is a flat, write-once,
read-many, single-backend (Supabase, already the one production
database this app uses) table, exactly matching `CLAUDE.md` Section 8's
own existing description of `projects.ts`'s job. Introducing a
`createProjectStore()` factory with a `MemoryProjectStore` for a table
that already has one obvious, always-available backend would be
speculative abstraction this project's own engineering philosophy
(Section 2) explicitly warns against: *"unnecessary abstraction is
exactly as bad as unnecessary cleverness."*

### 3.7 Supabase table migration

The live `projects` table (per the current `ProjectRecord` interface)
has columns: `id`, `created_at`, `title`, `score`, `summary`, `problem`,
`solution`. The new shape requires:

- **Add:** `session_id` (text, **unique**, required), `execution_id`
  (text, required), `owner_id` (uuid, nullable — Authentication not
  built yet), `profile` (jsonb, required), `verification` (jsonb,
  required).
- **Remove (or leave nullable/unused, pending review — see Section 7):**
  `score`, `summary`, `problem`, `solution` — no live code path produces
  any of these four values anymore; keeping them would be dead columns
  silently drifting out of sync with reality.
- **Keep unchanged:** `id`, `created_at`, `title`.

This is a genuine, necessary breaking schema change to the table itself
— not an additive-only evolution — because the columns being removed
have no honest source of truth left to populate them (Pre-Design
Verification). Per Milestone 25's own finding, the table has received no
new rows since before that milestone, in any real deployment; this
design proceeds on that basis but flags explicitly (Section 7) that the
live table's actual current row count/schema was not independently
queried in this session (no direct database access available) and must
be confirmed, not assumed, before any migration runs.

## 4. Data Lifecycle

- **Creation:** exactly once per completed `AnalysisSession`, triggered
  server-side on first-observed `state === "completed"`
  (Section 3.1/3.2). Never created for a session that is still running,
  cancelled, or failed — matches `DecisionReport`'s own existing
  "only render when `state === 'completed'`" gate, the same completion
  definition reused, not redefined.
- **Update:** **none — a hard architectural requirement, not a
  preference.** A Project is immutable once persisted (Section 3.3).
  Reopening or re-polling an already-completed session must never
  overwrite its stored snapshot (Section 3.2's insert-only,
  never-upsert guarantee); re-running the same idea always starts a
  brand-new session and, on its own completion, persists an entirely
  new, separate Project row rather than touching the old one
  (Section 3.1's "reopening vs. re-running" distinction). No code path
  in this milestone calls `UPDATE` or `upsert` on an existing `projects`
  row. **If project updates are ever needed (e.g., re-attaching a newer
  analysis to an existing Project, editable titles, or manual notes),
  that is explicitly out of scope here and belongs to a future,
  separately-designed milestone (tentatively Milestone 27) that defines
  its own explicit update lifecycle** — this milestone must not grow one
  informally as a side effect of persistence.
- **Read:** unchanged call sites — `listProjects()`, called from the two
  existing Server Component boundaries (`app/dashboard/page.tsx`,
  `app/dashboard/analysis/page.tsx`) and `app/projects/page.tsx`.
- **Ownership:** `ownerId` is stored as `null` for every Project until
  Authentication exists — an explicit, additive, forward-compatible
  column (`CLAUDE.md` Section 22's "additive evolution" rule), not a
  speculative feature. Until Authentication lands, every Project remains
  globally visible to any visitor, which is not a new gap this milestone
  introduces — it is the same implicit single-tenant behavior the
  hardcoded "Yasin / Founder" identity already represents everywhere
  else in this product today.
- **Deletion:** **out of scope.** No UI anywhere today offers a delete
  affordance for a project, and none is added by this milestone
  (Non-Goal).
- **Retention:** unbounded — no TTL, archival, or row-limit policy is
  introduced. Worth a future look once real usage volume exists
  (Design Debt), not a concern at today's scale.

## 5. API Changes

- **No new route.** Project creation is an internal side effect of the
  existing `GET /api/analysis-sessions/[id]` route
  (`app/api/analysis-sessions/[id]/route.ts`) — that route's own request
  handling, response shape (`jsonSuccess`/`jsonError`), and status codes
  are **completely unchanged**. Only the service function it calls
  (`getAnalysisSession`) gains an internal step.
- **No existing route's response shape changes.**
  `AnalysisSessionViewSchema`'s shape (`{session, verification}`) is
  untouched — a Project's existence is never reflected in this
  response; a client has no way to observe whether persistence
  succeeded, by design (Section 3.5's swallow-on-failure convention
  means persistence failure must never surface as an analysis failure).
- **No new route is added to list or fetch a single Project.**
  `listProjects()` continues to be called directly from Server
  Components, exactly as today — nothing client-side needs reactive
  project data yet (no client component polls or subscribes to the
  projects list). Flagged explicitly as an open question, not decided
  silently: a future `/projects/[id]` detail route (Roadmap Milestone 3
  territory, and `ReportHistoryPanel`'s own "Full historical report
  viewing is coming soon" placeholder) would need a route, but is out of
  this milestone's scope.

## 6. UI Changes

**This milestone cannot achieve pixel-identical output, and should not
attempt to.** The underlying data model fundamentally changed — three
of `ProjectRecord`'s seven fields (`score`, `problem`, `solution`) have
no honest value to display anymore (Pre-Design Verification). Attempting
to preserve their exact rendering would require fabricating data this
project's entire architecture refuses to fabricate. The scoped changes
required, file by file:

- **`app/projects/page.tsx`:** replace `project.score` badge with
  something real and available — e.g. `project.profile.confidenceSummary
  .evidenceConfidence` (already a 0–100 number, but explicitly a
  *data-quality* signal, not a business-quality score — must be labeled
  accordingly, e.g. "Confidence" not "Score," so it isn't misread as the
  verdict the old field implied). Replace `project.problem`/
  `project.solution` two-column layout with
  `project.profile.businessSummary.customerProblem`/
  `.valueProposition` (both optional — render each column's own honest
  "Not yet known" fallback when absent, matching every Intelligence
  card's existing convention, not a blank space).
- **`RecentProjectsPanel.tsx`:** replace `project.summary` with
  `project.profile.businessSummary.valueProposition ?? project.profile
  .businessSummary.businessModel` (the same fallback chain
  `DecisionSummaryPanel.tsx` already uses for its own header
  description — reused, not reinvented). Replace the score display with
  the same confidence figure, same relabeling.
- **`ReportHistoryPanel.tsx`:** replace the score suffix with the same
  confidence figure; `title` usage is unchanged.
- **`DashboardStats.tsx`:** "Average Score"/"Highest Score" cards must
  be relabeled (e.g. "Average Confidence"/"Highest Confidence") and
  recomputed from `project.profile.confidenceSummary.evidenceConfidence`
  instead of the removed `project.score`. This is a visible, honest
  label change, not a silent one — calling a data-quality metric "Score"
  would misrepresent it exactly the way this codebase's own
  `DecisionConfidenceSchema` comment warns against.
- **`RecentActivityPanel.tsx`:** functionally unchanged — it only ever
  read `title`/`created_at`/`id`, all of which survive unchanged in
  meaning on the new `Project` shape.

**Naming correction (caught during implementation, not anticipated in
the original draft):** every other schema in this codebase uses
camelCase (`SessionRecordSchema.createdAt`, `.executionId`), while the
legacy `ProjectRecord` was a raw, unmapped Supabase row using the
database's own snake_case column names (`created_at`). `ProjectSchema`
follows this codebase's own established camelCase convention
(`createdAt`), which means `lib/services/projects.ts` maps the raw
Supabase row's `created_at`/`session_id`/`execution_id`/`owner_id`
columns to `createdAt`/`sessionId`/`executionId`/`ownerId` at the
persistence boundary — the one place such a mapping belongs. This means
every consumer, including `RecentActivityPanel.tsx`, changes
`project.created_at` to `project.createdAt` — a mechanical rename with
zero effect on rendered output, not a functional change.
- **No change to `DecisionReport.tsx`, any of its six child components,
  `SessionProgressExperience`, `IdeaCommandCenter`, or any part of the
  live, in-progress analysis experience.** This milestone touches only
  the Project *list/history* surfaces, never the report-rendering
  surface itself.

**Explicitly out of scope for this milestone:** giving `ReportHistoryPanel`
a real "view full historical report" experience (its own existing
placeholder text already says "coming soon") — that requires a project
detail route (Section 5), a larger, separate piece of work.

## 7. Risks

- **Persist-on-GET is an unusual pattern and must be reviewed as such.**
  Mitigated by idempotency at the database level (Section 3.2), and by
  the fact that no existing test suite or CI exists to catch a
  regression here silently (`ATLAS_AI_PHASE_3_REVIEW.md`'s own
  already-named gap) — manual verification of the exact concurrent-tab
  scenario is required at implementation time, not assumed safe from
  design alone.
- **The live Supabase `projects` table's actual current schema and row
  count were not independently queried in this session** (no direct
  database access tool was available/used). This design's migration
  plan (Section 3.7) is based on `ProjectRecord`'s TypeScript interface
  and Milestone 25's own finding that the table has been receiving zero
  writes since before that milestone — both strong evidence, but not a
  substitute for directly confirming the table's real state
  (`supabase db` inspection or equivalent) before any destructive column
  change runs.
- **Snapshot storage means a `profile` jsonb column holding a
  potentially large, deeply nested object per row.** Acceptable at
  today's scale (`CLAUDE.md` Section 15: "measure before optimizing
  further... don't add speculative caching for problems that haven't
  been observed"). Flagged as Design Debt if `listProjects()`'s query
  performance or payload size ever becomes measurably slow — not
  assumed to be a problem today, since no platform has ever been
  exercised beyond fixture-scale data (`ATLAS_AI_PHASE_3_REVIEW.md`
  Section 1.8).
- **Ordering versus the Phase 3 Roadmap.** `ATLAS_AI_PHASE_3_REVIEW.md`
  Section 6 lists Authentication (item 2) before "first real persistence
  backend" (item 3). This design proceeds with Project persistence
  ahead of Authentication, reserving `ownerId` as a nullable,
  additive column rather than blocking on it. This is a deliberate,
  explicit judgment call surfaced for review sign-off, not decided
  silently: the Roadmap's own stated reason for that ordering was that
  *Financial/Business knowledge accumulation* needs per-user scoping to
  have correct identity semantics — a concern that does not apply here,
  since a Project snapshot has no accumulation/identity-resolution
  behavior at all (Section 3.3). Proceeding now closes a real, visible
  product gap (an always-empty projects list) without waiting on a
  larger, unrelated piece of work.
- **The session/pipeline layer's own non-durability (Pre-Design
  Verification) is a real, separate, pre-existing gap this milestone
  does not fix.** A Project snapshot is durable from the moment it's
  written, but the live, in-progress `SessionProgressExperience` for a
  not-yet-completed analysis is still lost on server restart, exactly as
  today. Named here so it isn't mistaken for something this milestone
  was responsible for and silently left broken.
- **A reviewer expecting exact visual parity with today's Project list
  UI** — explicitly not achievable (Section 6). Flagged prominently so
  it isn't discovered as a surprise at implementation/review time.

## 8. Definition of Done

1. **One new schema file**, `lib/schemas/project.ts`
   (`ProjectSchema`/`Project`), composed entirely from
   `DecisionProfileSchema` and `VerificationSummarySchema` imported
   verbatim, plus five new scalar fields (`id`, `sessionId`,
   `executionId`, `ownerId`, and reused `title`/`createdAt`) — zero
   hand-duplicated fields from either composed schema.
2. **`lib/services/projects.ts`** gains exactly one new function,
   `persistProjectFromSession(view: AnalysisSessionView): Promise<void>`,
   idempotent via a database-level unique constraint on `session_id`,
   following the file's existing log-and-swallow error convention.
   **Implemented as a plain `.insert()` — never `.upsert()` — with zero
   `UPDATE` code paths anywhere in the file**, so an already-persisted
   snapshot can never be silently overwritten by a later call
   (Section 3.2/4, immutability requirement). `listProjects()` is
   updated to return `Project[]`; `ProjectRecord` is retired in the same
   change (no two competing types for the same table).
3. **`lib/services/analysisSessions.ts`'s private `toView()`** is the
   only caller of `persistProjectFromSession`, invoked on every session
   view composition (start/get/cancel/retry) but only takes effect when
   `view.session.state === "completed"` — no other file calls it.
4. **Zero changes** to `lib/analysis-session/`, `lib/pipeline/`, or any
   of the six knowledge platforms — confirmed via `git status --short`
   touching none of those paths at implementation time.
5. **Supabase `projects` table migration** (Section 3.7) is written and
   reviewed against the table's actual, independently-confirmed current
   state before it runs — not assumed empty from this document alone.
6. **UI consumers updated** (`app/projects/page.tsx`,
   `RecentProjectsPanel.tsx`, `ReportHistoryPanel.tsx`,
   `DashboardStats.tsx`) to read the new `Project` shape, with every
   removed field (`score`, `problem`, `solution`) replaced by a real,
   honestly-labeled equivalent or an honest absence state — never a
   fabricated placeholder. `RecentActivityPanel.tsx` requires no change
   (confirmed, Section 6).
7. **No new API route.** `app/api/analysis-sessions/[id]/route.ts`'s own
   code, response shape, and status codes are byte-for-byte unchanged.
8. **Manual end-to-end verification, not assumed:** run one analysis to
   completion; confirm exactly one row appears in `projects`; continue
   polling (or open a second tab on the same session) and confirm no
   duplicate row is created; reload `/dashboard`, `/dashboard/analysis`,
   and `/projects` and confirm each renders the new, real row correctly,
   including its confidence figure and honest-absence fallbacks.
   **Immutability check, specifically:** record the persisted row's
   content (or its `createdAt`/`profile` payload) immediately after
   first completion, then re-poll the same completed session (or open it
   in a second tab) several more times and re-read the row — it must be
   byte-for-byte identical, not merely present. Separately, re-run the
   same idea as a brand-new analysis and confirm a second, independent
   row appears rather than the first row changing.
9. `tsc --noEmit` passes with zero errors; `eslint` introduces zero new
   errors.
10. **Nothing implemented or committed** until this design is explicitly
    reviewed — in particular, sign-off is requested on three specific
    judgment calls this document surfaces rather than decides
    unilaterally: (a) snapshot vs. pointer (Section 3.3), (b) proceeding
    before Authentication (Section 7), and (c) the exact replacement
    display fields for the removed `score`/`problem`/`solution`
    (Section 6).

---

*End of design specification. Awaiting review before any implementation
begins. Milestone 26 has not been started in code.*
