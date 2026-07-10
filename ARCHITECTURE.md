# Atlas AI — Architecture Snapshot

This document is the permanent architecture reference for Atlas AI. It reflects the state of the codebase after Sprint 3 (Production Foundation). It is descriptive, not aspirational — sections like "Technical Debt" and "Future Roadmap" call out where the code intentionally hasn't been changed yet.

Stack: Next.js 16.2.10 (App Router) · React 19.2.4 · TypeScript (strict) · Tailwind v4 · shadcn ("base-nova") · Zustand 5 · Zod 4 · Supabase JS · OpenAI SDK.

---

## 1. Folder Structure

```
app/
  api/chat/route.ts        POST /api/chat — thin controller (validate → services → response)
  layout.tsx, page.tsx      root layout + landing page
  globals.css               Tailwind v4 + shadcn design tokens (light/dark, largely unused today)
  dashboard/page.tsx        live product surface
  projects/page.tsx         Supabase-backed project list (Server Component)
  competitors/page.tsx      known bug — see Technical Debt
  pricing/ reports/ research/ settings/   static stub pages

components/
  dashboard/    dashboard shell + widgets (mixed live/demo data)
  landing/      marketing page sections (static)
  layout/       Navbar
  shared/       cross-cutting presentational primitives (new in Sprint 3)
    SectionHeader.tsx       eyebrow/heading/description block
    IconBadge.tsx           colored icon chip (sm/md/lg)
    AnalyzeButtonLabel.tsx  spinner/idle button content swap
    LoadingChecklist.tsx    "N steps in flight" list
  ui/           shadcn primitives (button.tsx only)
  workspace/    the idea-analysis feature's components (some live, most orphaned — see below)

hooks/
  useAnalyzeStartup.ts      shared fetch/loading/error hook for the analyze-idea flow

lib/
  api/response.ts           jsonSuccess / jsonError (Next.js route response helpers)
  errors/                   AppError hierarchy + getErrorMessage/getErrorStatus
  format.ts                 formatScore / formatPercent
  http/apiClient.ts         postJSON() client-side fetch wrapper
  schemas/analysis.ts       AnalysisResultSchema (Zod) — the single source of truth for the AI's output shape
  services/                 business logic, isolated from UI and routes
    openai.ts               OpenAI client + system prompt + raw completion call
    analysis.ts             orchestrates openai.ts + schema validation
    projects.ts             Supabase reads/writes for the `projects` table
  store/analysisStore.ts    Zustand store (loading/analysis + setters)
  validation/parse.ts       parseOrThrow() — schema validation → typed value or ValidationError
  supabase.ts               Supabase client (anon key)
  utils.ts                  cn() (shadcn's clsx+tailwind-merge helper)

public/       default Next.js starter assets, no brand assets yet
```

No `middleware.ts`, no `error.tsx`/`loading.tsx`, no tests, no CI config exist yet.

---

## 2. Services

All business logic that isn't presentation lives in `lib/services/`, callable from routes, Server Components, or (in principle) a future job/worker without touching React at all.

| Service | Responsibility | Depends on |
|---|---|---|
| `services/openai.ts` | Owns the OpenAI client and the Atlas system prompt; returns the raw parsed JSON completion. Throws `ExternalServiceError` on request or JSON-parse failure. | `openai`, `lib/errors` |
| `services/analysis.ts` | Orchestrates "idea string → validated `AnalysisResult`": calls `openai.ts`, then `parseOrThrow`s it against `AnalysisResultSchema`. | `services/openai.ts`, `lib/validation/parse.ts`, `lib/schemas/analysis.ts` |
| `services/projects.ts` | `createProject(analysis)` (insert, logs-not-throws on failure) and `listProjects()` (select, returns `[]` and logs on failure) against Supabase's `projects` table. | `lib/supabase.ts` |

`app/api/chat/route.ts` and `app/projects/page.tsx` are the only current callers — both are thin: they call a service, then map the result/error to a response or JSX.

---

## 3. Shared Components

`components/shared/` holds cross-cutting presentational primitives introduced in Sprint 3 to remove duplicated markup without changing visual output:

- **`SectionHeader`** — the eyebrow/heading/description block repeated at the top of every workspace analysis section. Adopted by `AnalysisOverview`, `ProblemCard`, `SolutionCard`, `CustomersCard`, `MarketCard`, `CompetitionCard`, `BusinessModelCard`, `FinancialCard`, `OpportunitiesCard`, `RisksCard`, `RoadmapCard`.
- **`IconBadge`** — the colored rounded icon chip, parameterized by size (`sm`/`md`/`lg`) and color classes, covering the three size/color combinations that existed across those same cards.
- **`AnalyzeButtonLabel`** — the spinner+"Analyzing..." / icon+"Analyze Startup" content swap, shared by `AIWorkspace` (live) and `IdeaInput` (orphaned) so the button's inner markup has one definition.
- **`LoadingChecklist`** — the "steps in flight" list shown while an analysis request is running, used by `AIWorkspace`.

These are additive: no existing component was deleted, and every adoption was verified to produce the same class set as before (Tailwind class order has no effect on rendering).

---

## 4. Data Flow

There are two independent data flows in the app today:

**Write path (analyze an idea):**
```
user types idea
  → useAnalyzeStartup().analyze(idea)
  → lib/http/apiClient.postJSON("/api/chat", { message: idea })
  → POST /api/chat
      → services/analysis.analyzeStartup(idea)
          → services/openai.generateStartupAnalysis(idea)   [OpenAI call]
          → AnalysisResultSchema validation                  [Zod]
      → services/projects.createProject(analysis)            [Supabase insert, non-fatal]
      → jsonSuccess(analysis)
  → hook validates the response again client-side (defense in depth)
  → onSuccess callback updates whichever state the caller uses
      (AIWorkspace: the hook's own state · IdeaInput: the Zustand store)
```

**Read path (`/projects`):**
```
app/projects/page.tsx (Server Component)
  → services/projects.listProjects()
  → Supabase select, ordered by created_at desc
  → rendered directly, no client-side state involved
```

These two paths never intersect: nothing links a completed analysis to its row in `/projects`, and there is no project detail route.

---

## 5. State Flow

Two state models coexist by design (not yet unified — see Technical Debt):

1. **Local hook state** — `AIWorkspace.tsx` (mounted at `/dashboard`, the only live analyze surface) owns `idea` via `useState` and gets `loading`/`analysis`/`error` from its own `useAnalyzeStartup()` instance. Nothing else reads this state; it dies with the component.

2. **Zustand global store** — `lib/store/analysisStore.ts` (`loading`, `analysis`, `setLoading`, `setAnalysis`, `reset`) is the shared state for the `IdeaInput` → `Workspace` → `Tabs` → card-components tree. As of Sprint 3, all 15 consumers read it via **per-field selectors** (`useAnalysisStore((s) => s.analysis)`) rather than whole-store destructuring, so a component only re-renders when the field it actually uses changes.

This store-backed tree (`DashboardShell`, `Workspace`, `IdeaInput`, `AnalysisProgress`, `ScoreCard`, `Tabs`, and everything `Tabs` renders) is fully wired and internally consistent, but **no route currently mounts it** — it's reachable only if something renders `DashboardShell` instead of `DashboardLayout`.

---

## 6. API Flow

Single route: **`POST /api/chat`**

```
1. Parse { message } from the request body.
2. Reject with InvalidRequestError (400) if message is missing/blank.
3. analyzeStartup(message) → AnalysisResult (or throws ValidationError/ExternalServiceError).
4. createProject(analysis) — persisted best-effort; a DB failure is logged, not fatal.
5. jsonSuccess(analysis) → 200, or jsonError(error) → status from the thrown AppError (400/502) or 500 for anything unexpected.
```

Response shape is exactly `AnalysisResultSchema` — the same schema the client re-validates on receipt. There is no rate limiting, no auth check, and no request size limit on this route yet.

---

## 7. Current Architecture Diagram (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                BROWSER                                  │
│                                                                          │
│  Landing (/)              Dashboard (/dashboard)        Projects        │
│  Navbar, Hero,            DashboardLayout                (/projects)    │
│  Features, HowItWorks,    ├─ Sidebar                    Server Component│
│  DashboardPreview,        ├─ Topbar                     → listProjects()│
│  Testimonials             ├─ AIWorkspace  ◄── LIVE analyze flow         │
│                           │   ├─ useAnalyzeStartup()                   │
│                           │   ├─ AnalyzeButtonLabel (shared)            │
│                           │   ├─ LoadingChecklist (shared)              │
│                           │   ├─ AIMetrics    (static demo numbers)     │
│                           │   ├─ AtlasVerdict (static demo verdict)     │
│                           │   └─ MarketChart  (static demo chart)       │
│                           └─ RightPanel (static demo numbers)           │
│                                                                          │
│  ┌─ ORPHANED (built, not routed by anything today) ───────────────────┐│
│  │ DashboardShell → Workspace                                         ││
│  │  ├─ IdeaInput ──► useAnalyzeStartup() ──► Zustand analysisStore    ││
│  │  ├─ AnalysisProgress                                               ││
│  │  ├─ ScoreCard             (all read the store via selectors)       ││
│  │  └─ Tabs → AnalysisOverview / MarketChart / CompetitionCard /      ││
│  │             BusinessModelCard / RoadmapCard                        ││
│  │  (ProblemCard, SolutionCard, CustomersCard, MarketCard,            ││
│  │   OpportunitiesCard, RisksCard, FinancialCard, WorkspaceHeader,    ││
│  │   AnalyzeButton kept for future wiring, not imported anywhere)     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────┬────────────────────────────────────────┘
                                   │ postJSON() — lib/http/apiClient.ts
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     POST /api/chat  (app/api/chat/route.ts)               │
│   1. validate request body            → lib/errors (InvalidRequestError) │
│   2. analyzeStartup(idea)              → lib/services/analysis.ts        │
│        → generateStartupAnalysis(idea) → lib/services/openai.ts          │
│        → AnalysisResultSchema.parse()  → lib/schemas/analysis.ts (Zod)   │
│   3. createProject(analysis)           → lib/services/projects.ts        │
│   4. jsonSuccess / jsonError           → lib/api/response.ts             │
└───────────────────┬───────────────────────────────┬──────────────────────┘
                     │                               │
                     ▼                               ▼
            ┌────────────────┐              ┌───────────────────────┐
            │   OpenAI API   │              │  Supabase (projects)  │
            │  gpt-4.1-mini  │              │   insert / select     │
            └────────────────┘              └───────────────────────┘
```

---

## 8. Design Principles

1. **Business logic lives in services, not components or routes.** Routes/pages call a service and translate its result/error; they don't reach into `openai`/`supabase` directly.
2. **One schema, one type.** `AnalysisResultSchema` (Zod) is the single source of truth for the AI's output shape; the TypeScript type is inferred from it, never hand-duplicated.
3. **Validate at every boundary.** The server validates the model's output before persisting or responding; the client re-validates the response before trusting it.
4. **Additive, reversible change.** Nothing is deleted speculatively — components and dependencies that aren't wired in yet are kept intentionally for future sprints, clearly noted as such rather than silently rotting.
5. **Shared primitives over copy-paste.** Recurring markup (headers, icon chips, button states, loading lists) gets one definition in `components/shared/`, adopted without altering rendered output.
6. **State lives where it's read.** Local component state for local-only concerns (`AIWorkspace`); the Zustand store for state shared across a component subtree — not the whole app defaulting to global state.
7. **No redesign as a side effect of refactoring.** Architecture and visual design are separate workstreams; a refactor sprint should not change what the user sees.

---

## 9. Coding Standards

- **TypeScript strict mode, no `any`.** If a third-party type is awkward (e.g. `lucide-react` icons), use its exported type (`LucideIcon`) rather than widening.
- **`"use client"` only where needed.** Server Components (like `app/projects/page.tsx`) stay server-only; client state/interactivity is isolated to the components that need it.
- **Errors are typed.** Anything a service deliberately throws extends `AppError` (`ValidationError`, `ExternalServiceError`, `InvalidRequestError`) so a route can map it to the right HTTP status without string-matching messages.
- **Zustand consumers select fields, not the whole store.** `useAnalysisStore((s) => s.analysis)`, never `const { analysis } = useAnalysisStore()`, to avoid re-rendering on unrelated state changes.
- **Hooks expose callbacks, not just state.** `useAnalyzeStartup` drives either its own internal state or an external store via `onStart`/`onSuccess`/`onError`/`onSettled`, so it isn't coupled to one state backend.
- **No dead-code deletion without explicit sign-off.** Components/dependencies not currently wired into a route are left in place and documented, not removed, unless a sprint explicitly authorizes deletion.
- **Minimal comments.** Code should read from naming; comments are reserved for non-obvious constraints (e.g. why a ref is synced in an effect instead of during render).

---

## 10. Future Roadmap

Not yet scheduled to a sprint; ordered roughly by leverage:

1. **Unify the two analyze-idea implementations.** Either route `/dashboard` to the Zustand-backed `Workspace`/`Tabs` tree and retire `AIWorkspace`'s parallel implementation, or formally decide `AIWorkspace` is canonical and retire the orphaned tree. Currently both are maintained in parallel.
2. **Surface the AI's unused output.** `strengths`, `weaknesses`, `risks`, `opportunities`, `next_steps`, `verdict`, `confidence`, `investment_decision`, and the four sub-scores are generated (and partly persisted) but never shown to a user on the live route.
3. **Fix `/competitors`.** It currently renders a copy of the `/projects` page.
4. **Add a project detail route** (`/projects/[id]`) — the list currently has nowhere to link to.
5. **Auth.** No session/user model exists; "Yasin / Founder" is hardcoded in the UI.
6. **Route-level `error.tsx`/`loading.tsx`.** No error or loading UI exists at the segment level today.
7. **Harden `/api/chat`.** Rate limiting, request size limits, and moving off the anon Supabase key for writes.
8. **Tests + CI.** Neither exists yet.
9. **Adopt the shadcn design tokens** (or deliberately drop them) — `globals.css` defines a full light/dark token system that almost nothing in the app currently uses.

---

## 11. Technical Debt

Carried forward from the Sprint 2 audit; status noted where Sprint 3 touched it.

| Item | Status |
|---|---|
| Two parallel analyze-idea implementations (`AIWorkspace` vs. `Workspace`/`Tabs`) | **Unresolved.** Sprint 3 removed the *duplicated logic* between them (both now use `useAnalyzeStartup`), but the *duplicated implementation* itself remains — this is the single largest piece of debt left. |
| `app/competitors/page.tsx` renders the wrong content (pasted from `/projects`) | **Unresolved** — out of scope for Sprint 3 (no route/behavior changes permitted). |
| Unused workspace components (`ProblemCard`, `SolutionCard`, `CustomersCard`, `MarketCard`, `OpportunitiesCard`, `RisksCard`, `FinancialCard`, `WorkspaceHeader`, `AnalyzeButton`) | **Kept intentionally** per Sprint 2 direction ("future components"); internally cleaned up in Sprint 3 (now use `SectionHeader`/`IconBadge`) but still not imported by any mounted route. |
| Unused dashboard components (`DashboardShell`, `Header`, `StatsCards`, `RecentProjects`, `AIProgress`) and empty `Activity.tsx` | **Kept, unchanged** — deletion is explicitly out of scope until authorized. |
| Unused dependencies (`ai`, `react-markdown`, `remark-gfm`, `react-icons`, `framer-motion`) | **Kept, unchanged** — removal explicitly out of scope. |
| `AtlasVerdict` and `MarketChart` show static/hardcoded content regardless of the real analysis | **Unresolved** — this is a visual/behavioral change, out of scope until a redesign sprint is authorized. |
| No auth, no rate limiting, anon Supabase key used for both reads and writes | **Unresolved.** |
| No tests, no CI | **Unresolved.** |
| `shadcn` listed as a runtime `dependency` rather than `devDependency` | **Unresolved**, low priority — verify intent before touching. |
| shadcn design tokens (oklch light/dark theme) defined but essentially unused across components | **Unresolved.** |

---

## 12. Sprint History

- **Pre-Sprint 2 (scaffold).** `create-next-app` + shadcn + a landing page + a demo dashboard + one working analyze-idea flow wired directly to OpenAI and Supabase. No git history, no formal architecture, no tests.
- **Sprint 2 — Architecture unification.** First git commit (repo initialized, `.gitignore` hardened, global git identity configured). Introduced `lib/schemas/analysis.ts` (Zod) as the single source of truth for the AI response shape, replacing a hand-duplicated TypeScript interface. Introduced `hooks/useAnalyzeStartup.ts`, consolidating the fetch/loading/error logic that had been duplicated between `AIWorkspace` and `IdeaInput`. Removed the two remaining `any` types in the codebase. Added server-side response validation to `/api/chat`. No components deleted, no dependencies removed, no visual changes.
- **Sprint 3 — Production Foundation.** Added a `lib/services/` layer (`openai`, `analysis`, `projects`) to separate business logic from routes/UI; reduced `app/api/chat/route.ts` to a thin controller. Added a typed error hierarchy (`lib/errors/`), an API response helper (`lib/api/response.ts`), an API client (`lib/http/apiClient.ts`), a validation helper (`lib/validation/parse.ts`), and formatting helpers (`lib/format.ts`). Hardened `useAnalyzeStartup` (stable callback identity via ref + effect) and switched all 15 Zustand store consumers to per-field selectors to eliminate unnecessary re-renders. Introduced `components/shared/` primitives (`SectionHeader`, `IconBadge`, `AnalyzeButtonLabel`, `LoadingChecklist`) and adopted them across 10 workspace cards and both idea-input surfaces, removing duplicated markup with verified byte-identical visual output. Verified via `tsc --noEmit` and `eslint` (one new lint issue introduced by the ref-during-render pattern was caught and fixed before sign-off). No components deleted, no dependencies removed, no routes or visuals changed.
- **Sprint 4 (this document).** Architecture Snapshot (`ARCHITECTURE.md`) authored as the permanent reference point. No code changed.

---

## 13. Current Health Score

Qualitative, not a formula — a snapshot for future sprints to compare against.

| Category | Score | Notes |
|---|---|---|
| Type safety | 9/10 | Strict mode clean, no `any`, one schema drives the type everywhere it matters. |
| Error handling | 7/10 | Typed error hierarchy + graceful degradation on the write path; still no route-level `error.tsx`, no handling for Supabase read failures beyond logging. |
| Code duplication | 6/10 | Sharply reduced this sprint (shared primitives, one hook, one schema); the two-parallel-implementation issue is the one large duplication left. |
| Architecture separation (services/UI) | 8/10 | Clean service boundaries now exist; not yet covered by any test that would catch a regression. |
| State management hygiene | 8/10 | Per-field Zustand selectors, callback-driven hook; the split between local and global state across the two implementations is still a source of confusion. |
| Component composition | 7/10 | Real reduction in repeated markup; several components remain intentionally unwired rather than truly composed into the live tree. |
| Feature completeness vs. AI output | 4/10 | Roughly a third of the AI's structured output (`strengths`, `weaknesses`, `risks`, `opportunities`, `verdict`, `confidence`, sub-scores) is generated and/or persisted but never shown on the live route. |
| Security | 3/10 | No auth, no rate limiting, anon key used for writes, no input size limits. |
| Test coverage | 0/10 | No tests exist. |
| Documentation | 7/10 | This document plus the Sprint 2 audit cover the system well; no per-module README/JSDoc convention established yet. |

**Overall: ~6/10 — a solid, honestly-documented architectural foundation with real duplication and rendering debt paid down, but meaningful gaps in testing, security, and feature completeness still ahead.**
