# Atlas AI — Milestone 25 Design Specification

**Retire the Orphaned Legacy Analysis Flow**

Status: **Design only. No code, no folders, no source files modified.**

This is Phase 3's first milestone (per `ATLAS_AI_PHASE_3_REVIEW.md`'s own
Theme A), and the first milestone in this entire project whose purpose
is deletion, not addition. It closes the debt named — but never acted
on — since before Milestone 1 of this project's original roadmap
(*"Unify the analyze-idea implementation... the single highest-leverage
remaining piece of architectural debt"*), and reconfirmed in the Phase 3
review's own Section 1.1.

---

## Pre-Design Verification

### Method

Every claim below is a direct grep/read result against the current
working tree, not a recollection from the Phase 3 review. Every file
named as "dead" was independently re-verified to have zero external
callers at the time this document was written. Every file named as
"live" was independently re-verified to be reachable from an actual
route.

### The live flow, traced end to end

```
app/dashboard/layout.tsx
  → AppShell (components/dashboard/shell/)
      → Sidebar, Header, NotificationsMenu, ProfileMenu, SidebarNavItem

app/dashboard/page.tsx
  → listProjects() (lib/services/projects.ts)
  → DashboardHome (components/dashboard/home/)
      → DashboardWelcome, DashboardStats, RecentProjectsPanel, RecentActivityPanel

app/dashboard/analysis/page.tsx
  → listProjects() (lib/services/projects.ts)
  → AIWorkspace (components/dashboard/AIWorkspace.tsx)
      → useAnalysisSession (hooks/useAnalysisSession.ts)
          → POST /api/analysis-sessions → lib/analysis-session/ → lib/pipeline/
            → six knowledge platforms → DecisionProfile / VerificationSummary
      → IdeaCommandCenter (components/workspace/command-center/)
      → SessionProgressExperience (components/workspace/session/)
      → DecisionReport (components/workspace/decision-report/) — six cards,
        Milestone 24-cleaned
      → ReportHistoryPanel (components/workspace/history/)
```

**Confirmed directly:** every file in this chain imports only other
files in this chain, `lib/`'s knowledge platforms, `components/shared/`,
or `components/ui/`. Zero imports from any file named "dead" below.

### The dead code, mapped exhaustively

**Tier 1 — Dashboard shell, superseded (12 files, zero external
callers, confirmed via grep against all of `app/` and `components/`):**

```
components/dashboard/DashboardShell.tsx
components/dashboard/DashboardLayout.tsx
components/dashboard/Header.tsx
components/dashboard/Topbar.tsx
components/dashboard/Sidebar.tsx
components/dashboard/RightPanel.tsx
components/dashboard/StatsCards.tsx
components/dashboard/RecentProjects.tsx
components/dashboard/AIProgress.tsx
components/dashboard/AIMetrics.tsx
components/dashboard/Activity.tsx
components/dashboard/AtlasVerdict.tsx
```

Not a new finding — **`DASHBOARD.md`'s own text already documents this
cluster by name**: *"the old shell... No longer referenced by
`/dashboard`... kept in place rather than deleted, consistent with this
project's standing practice of never removing working code without
explicit instruction."* This milestone is that explicit instruction
being sought.

**Tier 2 — Legacy `IdeaInput`/`Workspace`/`Tabs` tree (19 files, zero
external callers except `Workspace.tsx` ← `DashboardShell.tsx`, itself
Tier 1):**

```
components/workspace/AnalysisOverview.tsx
components/workspace/AnalysisProgress.tsx
components/workspace/AnalyzeButton.tsx
components/workspace/BusinessModelCard.tsx
components/workspace/CompetitionCard.tsx
components/workspace/CustomersCard.tsx
components/workspace/FinancialCard.tsx
components/workspace/IdeaInput.tsx
components/workspace/MarketCard.tsx
components/workspace/MarketChart.tsx
components/workspace/OpportunitiesCard.tsx
components/workspace/ProblemCard.tsx
components/workspace/RisksCard.tsx
components/workspace/RoadmapCard.tsx
components/workspace/ScoreCard.tsx
components/workspace/SolutionCard.tsx
components/workspace/Tabs.tsx
components/workspace/Workspace.tsx
components/workspace/WorkspaceHeader.tsx
```

This tree contains the two fabrication bugs already found and named at
Milestones 21/22 and restated in the Phase 3 review:
`MarketChart.tsx`'s hardcoded five-year data series, and
`FinancialCard.tsx`'s static, non-generated "Financial Recommendation"
paragraph.

**Tier 3 — A fourth, never-wired report-rendering generation (13 files,
zero callers found anywhere — not even from Tier 2's own `Workspace.tsx`/
`Tabs.tsx`):**

```
components/workspace/report/AnalysisReport.tsx
components/workspace/report/BusinessModelSection.tsx
components/workspace/report/CompetitionSection.tsx
components/workspace/report/ExecutiveSummarySection.tsx
components/workspace/report/FinancialSection.tsx
components/workspace/report/MarketSection.tsx
components/workspace/report/ReportActions.tsx
components/workspace/report/ReportNav.tsx
components/workspace/report/RoadmapSection.tsx
components/workspace/report/ScoreBreakdown.tsx
components/workspace/report/ScoreGauge.tsx
components/workspace/report/SwotSection.tsx
components/workspace/report/VerdictSection.tsx
```

A genuinely new finding this milestone's own verification surfaced —
the Phase 3 review named Tiers 1–2 but had not yet traced this folder.
It appears to be an abandoned attempt at a nicer, scrollable report
layout for the old `AnalysisResult` schema, built and then never
connected to `Workspace.tsx`/`Tabs.tsx` at all.

**Tier 4 — One orphaned experience component (zero callers):**

```
components/workspace/thinking/AIThinkingExperience.tsx
```

**Tier 5 — A third, independent, never-wired pipeline (28 files, zero
external callers; its own `index.ts` states "Not yet wired into
app/api/chat/route.ts"):**

```
lib/analysis/index.ts
lib/analysis/mappers/reportAssembler.ts
lib/analysis/pipeline/runAnalysisPipeline.ts
lib/analysis/prompts/*.ts (10 files)
lib/analysis/scoring/scoring.ts
lib/analysis/stages/*.ts (10 files)
lib/analysis/types/context.ts
lib/analysis/types/stage.ts
```

**Tier 6 — The legacy hook and store (2 files):**

```
hooks/useAnalyzeStartup.ts   — callers: components/workspace/IdeaInput.tsx (Tier 2) only.
                                 Two comment-only mentions in
                                 hooks/useAnalysisSession.ts ("Replaces
                                 useAnalyzeStartup...") are documentation,
                                 not imports — confirmed by reading both
                                 lines directly.
lib/store/analysisStore.ts   — callers: every Tier 2 file that reads
                                 useAnalysisStore (14 of the 19).
```

**Total, Tiers 1–6: 75 files, all independently confirmed reachable
from nothing.**

### The coupled cluster — requires a scoped edit, not a pure deletion

Four more files are only reachable from Tier 1–6 files **plus one live
route**, and one live file needs a targeted edit rather than deletion:

```
app/api/chat/route.ts          — a live, deployed API route. Zero UI
                                   caller anywhere (grep-confirmed: the
                                   only real `fetch`/`postJSON` call to
                                   "/api/chat" in the entire repo is
                                   inside hooks/useAnalyzeStartup.ts,
                                   Tier 6, itself uncalled by anything
                                   live). Calls lib/services/analysis.ts
                                   and lib/services/projects.ts.
lib/services/analysis.ts        — analyzeStartup(). Callers: app/api/chat/route.ts
                                   only.
lib/services/openai.ts          — callers: lib/services/analysis.ts
                                   (above) and lib/analysis/stages/*.ts
                                   (Tier 5). Both retiring in this
                                   milestone; zero callers remain after.
lib/schemas/analysis.ts          — AnalysisResult. Callers: every Tier 3
                                   file, hooks/useAnalyzeStartup.ts
                                   (Tier 6), lib/store/analysisStore.ts
                                   (Tier 6), every lib/analysis/ file
                                   (Tier 5), lib/services/analysis.ts
                                   (above), and lib/services/projects.ts
                                   (live — see below).
```

**`lib/services/projects.ts` — the one live file requiring a scoped
edit, not deletion.** Read in full. It exports two functions:

- `listProjects()` — returns `ProjectRecord[]`, has **no** dependency on
  `AnalysisResult`. **Live**: called by both `app/dashboard/page.tsx` and
  `app/dashboard/analysis/page.tsx`.
- `createProject(analysis: AnalysisResult)` — **its only caller anywhere
  is `app/api/chat/route.ts`** (confirmed directly). The live session
  flow (`lib/analysis-session/`, `lib/services/analysisSessions.ts`,
  `app/api/analysis-sessions/`) was grep-checked directly and **never
  calls `createProject`** — a genuinely separate, honest finding
  (Section "A Real, Separate Gap," below), not something this milestone
  is responsible for fixing.

### Confirming nothing else references any of the above

- Zero dynamic (`import(...)`) usage anywhere in the repo — every
  reference above is a static import, so this reachability analysis is
  exhaustive, not probabilistic.
- Zero test files, zero CI config exist to reference these paths
  (confirmed in the Phase 3 review; reconfirmed here).
- `next.config.ts` contains no redirects, rewrites, or path references
  to any of the above.
- The only `.md` files referencing `/api/chat` are architecture/history
  documents (`ARCHITECTURE.md`, `PIPELINE.md`, `CLAUDE.md`,
  `MILESTONE_14_DESIGN.md`) describing what it *was*, not live
  operational dependencies.

### A real, separate gap this milestone does not fix

The live session flow has **no equivalent of `createProject()`** — a
completed `DecisionProfile` is never persisted as a `projects` row
today. `ReportHistoryPanel`/`RecentProjectsPanel`/`listProjects()` only
ever surface rows created via the legacy `/api/chat` path, which nothing
calls anymore. This means, in the current live product, **the projects
list and history panel are functionally always empty** in any real
deployment, regardless of how many analyses a founder runs. This is a
real, user-visible product gap — but it is a *missing capability*, not
something this retirement milestone breaks; it was already true before
this milestone and remains true after it. Named here so it isn't
mistaken for a regression this milestone caused, and flagged as
necessary follow-up work (Non-Goals/Future Growth).

---

## 1. Purpose

Delete the fully-orphaned legacy analysis implementation (Tiers 1–6, 75
files) and the four-file coupled cluster it exclusively depends on
(`app/api/chat/route.ts`, `lib/services/analysis.ts`,
`lib/services/openai.ts`, `lib/schemas/analysis.ts`), and make one
scoped edit to `lib/services/projects.ts` (remove `createProject()` and
its `AnalysisResult` import; `listProjects()`/`ProjectRecord` untouched)
— closing the debt named since before this project's Milestone 1,
verified safe against the live flow by exhaustive, direct reachability
analysis rather than assumption.

## 2. Product Vision

> Twenty-four milestones were spent making the live analysis flow
> honest, evidence-linked, and complete. For the entire duration, a
> second, unreachable copy of the same feature sat alongside it,
> carrying two live fabrication bugs no one was checking, because
> nobody could reach it to notice. This milestone doesn't change what a
> founder experiences — it removes the parts of the codebase that could
> never have honored this project's own "never fabricate" principle in
> the first place, because nothing was watching them.

## 3. Goals Verification

- ✅ **Verify every legacy analysis path and every caller** — six tiers,
  75 files, plus the four-file coupled cluster, each with its caller set
  independently grep-confirmed (Pre-Design Verification).
- ✅ **Identify everything genuinely unreachable** — confirmed via static
  import analysis; zero dynamic imports exist anywhere to complicate
  this.
- ✅ **Produce a safe deletion plan** — Section "Deletion Plan," below.
- ✅ **Distinguish delete now / archive / keep temporarily** — Section
  "Deletion Plan."
- ✅ **Verify removal won't affect the live flow** — Section "The live
  flow, traced end to end" plus the explicit cross-check that zero live
  file imports any dead file.

## Deletion Plan

### Delete now (git history is the archive)

All 75 Tier 1–6 files, plus the four coupled-cluster files
(`app/api/chat/route.ts`, `lib/services/analysis.ts`,
`lib/services/openai.ts`, `lib/schemas/analysis.ts`) — **79 files total.**
This project is git-versioned with full history preserved on
`origin/main`; a separate "archive" copy inside the working tree would
be redundant with what `git log`/`git show` already provides for free,
and would itself be new dead code the moment it's created. **Recommendation:
delete outright, rely on git history as the archive** — consistent with
this project's own standing practice (`git status` before any
destructive operation, never `rm -rf` without checking, but deletion
itself, once verified safe, is the correct action per `CLAUDE.md`'s own
"don't use feature flags or backwards-compatibility shims when you can
just change the code").

### Scoped edit, not deletion

`lib/services/projects.ts` — remove `createProject()` and its
`import type { AnalysisResult } from "@/lib/schemas/analysis"` line only.
`listProjects()`/`ProjectRecord`/the `supabase` import remain byte-for-byte
unchanged.

### Keep, untouched

Everything in the live flow trace (Pre-Design Verification) —
`components/dashboard/home/`, `components/dashboard/shell/`,
`components/dashboard/AIWorkspace.tsx`, `components/workspace/command-center/`,
`session/`, `decision-report/`, `history/`, `hooks/useAnalysisSession.ts`,
`lib/store/sessionStore.ts`, `lib/schemas/analysisSessionView.ts`,
`lib/services/analysisSessions.ts`, `lib/supabase.ts`, every knowledge
platform, `lib/decision/`, `lib/verification/`, `lib/pipeline/`,
`lib/analysis-session/`, `app/api/analysis-sessions/`.

### Keep temporarily (explicit open question for review, not a
unilateral call)

**Whether to retire `/api/chat`/`createProject` in this same milestone,
or hold it one milestone longer**, is the one genuine judgment call this
design surfaces rather than decides. Arguments for retiring now: nothing
calls it, it is entirely coupled to the schema this milestone exists to
retire, and deleting the code path does not delete any existing database
rows — it only stops a dead path from creating new ones (which it isn't
doing anyway, since nothing invokes it). Argument for waiting: Phase 3's
own Theme A (Authentication + real persistence) will need to design a
*new* "save a completed `DecisionProfile` as a project" path regardless,
and could plausibly want to look at `createProject()`'s own
insert-shape-and-error-handling convention as a reference while doing
so. **This design's recommendation is to retire it now** (Section
"Deletion Plan" already includes it), since the reference value of
dead, schema-mismatched code is low and git history preserves it exactly
as well as leaving it in the working tree would — but this is flagged
explicitly for review sign-off rather than bundled in silently.

## Architectural Discovery

The Phase 3 review's own Section 1.1 named two tiers (`DashboardShell`
cluster and `lib/analysis/`); this milestone's own direct verification
found two more (the never-wired `report/` folder, and the full 12-file
extent of the dashboard-shell cluster, which the review had only
partially enumerated). This confirms the review's own methodology
(direct re-inspection over recollection) was correctly applied here too
— the true scope of this debt was larger than even the review captured,
and would not have been fully surfaced without this milestone's own
exhaustive pass.

## Knowledge vs Observation

Not applicable — no knowledge-platform schema or accumulation semantics
are touched. This is a reachability-and-deletion milestone.

## Data Flow

No data flow changes for any live route. The only data-flow-adjacent
fact worth stating: `createProject()`'s removal does not change
`listProjects()`'s behavior in any way — they share no state, no cache,
no common code path beyond both querying the same `projects` table
independently.

## Why This Should Remain a Pure Deletion, Not a Refactor

No behavior is added, changed, or fixed by this milestone — including
the two known fabrication bugs, which are deleted along with the code
that contains them, not "fixed in place." There is no reason to repair
code that is being removed in its entirety.

## Risks

- **Deleting something that turns out to have a caller this review
  missed.** Mitigated by the exhaustiveness of the static-import
  analysis (no dynamic imports exist anywhere) and by the fact that
  `tsc --noEmit` will fail loudly and immediately at implementation time
  if any deleted file is still referenced anywhere — a deletion mistake
  cannot silently pass verification.
- **The `createProject()` judgment call being wrong** — mitigated by
  explicitly surfacing it for review rather than deciding it silently
  (see "Keep temporarily," above).
- **A reviewer expecting the "real, separate gap" (no persistence path
  for completed sessions) to be fixed here** — explicitly a Non-Goal;
  named clearly so it registers as follow-up work, not a missed
  requirement of this milestone.

## Design Deviations

None found requiring a fix — this milestone deletes, it does not repair
or preserve legacy behavior.

## Non-Goals

- Does not fix the "no persistence path for completed sessions" gap
  (Pre-Design Verification's own "A real, separate gap" section) — a
  real, separate, future milestone's job, most naturally paired with
  Phase 3's Authentication/persistence work.
- Does not touch Authentication (explicitly deferred per this turn's own
  instruction: "Do not begin Authentication yet").
- Does not modify any live route, live component, or live service beyond
  the one scoped edit to `lib/services/projects.ts`.
- Does not modify any knowledge platform, `lib/decision/`,
  `lib/verification/`, `lib/pipeline/`, or `lib/analysis-session/`.
- Does not attempt to "fix" `MarketChart.tsx`'s or `FinancialCard.tsx`'s
  fabrication bugs — they are deleted with the rest of Tier 2, not
  patched.

## Complexity Review

- **Whether to archive deleted files somewhere in the working tree was
  directly considered and rejected** — git history already serves this
  purpose without creating new, immediately-dead artifacts.
- **Whether `createProject()`/`/api/chat` retirement belongs in this
  milestone or a later one was directly considered** — resolved as
  in-scope, but flagged for explicit review sign-off rather than
  silently decided (Section "Keep temporarily").

## Performance Review

Not applicable in the usual sense — deleting unreachable code has zero
runtime performance effect. The only measurable effect is a smaller
bundle: none of the 79 deleted files could ever have been included in
any live route's bundle anyway (Next.js only bundles what a route's
import graph actually reaches), so even this effect is likely
negligible — worth confirming, not assuming, via the production build's
own route/bundle output at implementation time.

## Deterministic Reasoning

Trivially satisfied — no reasoning, judgment, or generative logic is
introduced. This milestone's only "decision" (the `createProject`
question) is a human product/architecture call, not a data-classification
one.

## Design Debt

1. **The "no persistence path for completed sessions" gap** (Pre-Design
   Verification) — real, pre-existing, not created or fixed by this
   milestone, explicitly named for future work.
2. **`ARCHITECTURE.md`/`CLAUDE.md`'s Folder Rules will need a documentation
   pass reflecting the smaller, cleaner tree** post-deletion — a natural,
   low-cost follow-up, not blocking.

## Product Readiness

This milestone makes zero product-facing change. Its value is entirely
to the codebase's own integrity: removing 79 files that could never
honor this project's stated principles, including two files that
actively violated them in ways nobody could observe.

## Future Growth

- **A real "save completed analysis as a project" path**, designed
  fresh against `DecisionProfile`/`VerificationSummary` rather than
  adapted from the deleted `createProject()`, is the natural next
  product-value follow-up — likely paired with Phase 3's own
  Authentication work, since a real per-user project list requires
  knowing whose project it is.
- **The `ARCHITECTURE.md`/`CLAUDE.md` Folder Rules documentation refresh**
  (Design Debt #2) is a small, natural next step once this deletion
  lands.

## Definition of Done

1. **79 files deleted**: all of Tiers 1–6 (Pre-Design Verification) plus
   `app/api/chat/route.ts`, `lib/services/analysis.ts`,
   `lib/services/openai.ts`, `lib/schemas/analysis.ts` — pending
   explicit review sign-off on the "keep temporarily" question above.
2. **One scoped edit**: `lib/services/projects.ts` loses `createProject()`
   and its `AnalysisResult` import; `listProjects()`/`ProjectRecord`
   byte-for-byte unchanged.
3. **Zero changes** to any file in the live flow trace.
4. `tsc --noEmit` passes with zero errors post-deletion — the definitive
   proof no live file referenced anything deleted.
5. `eslint` introduces zero new errors.
6. `next build` completes successfully; the same 15 routes present
   before this milestone are present after (no route added or removed
   by this milestone, since `/api/chat` was an API route, not a page,
   and its removal changes the build's route manifest in an expected,
   verifiable way — confirm the route list explicitly at implementation
   time).
7. Manual verification: `/dashboard`, `/dashboard/analysis` (full
   analyze flow), and `/projects` all function identically to before
   this milestone.
8. `git status --short` shows only deletions and the one edited file —
   no new file created.
9. Nothing committed until explicitly requested.

---

*End of design specification. Awaiting review before any implementation
begins.*
