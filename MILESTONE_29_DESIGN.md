# Atlas AI — Milestone 29 Design Specification

**Phase 3 Theme B — Close the Visible Product Gaps**

Status: **Design only. No code, no folders, no source files modified.
No migrations. No commits.**

---

## Pre-Design Audit

See the audit performed immediately before this document (preserved in
conversation history, not duplicated here in full). Summary of
confirmed findings:

- `/competitors` still renders `ProjectsPage`'s literal content — the
  original copy-paste bug, unchanged.
- No `/projects/[id]` route exists.
- `RecentProjectsPanel`, `ReportHistoryPanel`, and `/projects`'s cards
  render project data with no links at all.
- `Header.tsx`'s search input has no `onChange`/`value` — confirmed
  decorative.
- `/reports`, `/research`, `/templates`, `/settings` are still literal
  one-line `<h1>` stubs.
- Zero `error.tsx` files exist anywhere.
- `DecisionReport` takes exactly `{ profile: DecisionProfile,
  verification: VerificationSummary }` — identical to the two fields
  already stored on every `Project` row, enabling full reuse for
  Deliverable 2 with zero new report-rendering work.
- `/pricing` (still a stub) is explicitly **excluded** from this
  milestone's scope, per your confirmation.
- **Scope addendum (approved after initial review):**
  `components/layout/Navbar.tsx`'s dead "Sign In"/"Get Started" buttons
  are now **in scope**, added explicitly as a Theme B product-polish
  task, not a new feature. Re-read directly: both remain bare
  `<Button>` elements with no `href`/`onClick`; `Features`, `Pricing`,
  `Blog`, `Contact` are separate `<Link href="#">` nav items in the
  same component, not named in the addendum. A second, identical dead
  "Get Started" button (plus a dead "Live Demo" button) exists in
  `components/landing/Hero.tsx` — **not named in the addendum, so not
  included** here; flagged as an adjacent, not-yet-decided item, same
  treatment as the original Navbar flag before it was resolved.

---

# 1. Goal

**Exact purpose:** close the specific, named, currently-broken or
missing user-facing surfaces this codebase has carried since before
Milestone 20: the `/competitors` bug, the absence of any project detail
view, non-functional dashboard search, four bare stub pages, and the
total absence of error boundaries.

**User problem solved:** today, a signed-in founder with real, saved
projects (Milestone 26–27c made this possible for the first time) still
cannot click into any of them, cannot search for one, lands on a
literally wrong page if they click "Competitors" in the sidebar, and
sees an unstyled `<h1>` on four more sidebar destinations. None of this
is a missing *capability* in the sense Milestone 4 (Startup Builder)
would be — it's finished-but-never-wired product surface.

**Why now:** this is the next, and first fully unblocked, item in
`ATLAS_AI_PHASE_3_REVIEW.md`'s own Theme B, immediately following Theme
A's complete closure (Milestones 25–28). Every one of these gaps has
been visible and named since before Milestone 24; none required
Authentication or persistence to fix until now — and now that both
exist, there's no remaining reason to defer them.

**Fit with long-term architecture:** this milestone adds **no new
knowledge platform, no new schema concept, and no new persistence
mechanism.** It is entirely a consumer of what Milestones 26–28 already
built (`Project`, `getCurrentUser()`, RLS-backed ownership,
`DecisionReport`). It's the first milestone whose entire job is
*surfacing* existing architecture rather than extending it — a
deliberate, low-risk choice consistent with closing debt before
Milestone 4's much larger, riskier Startup Builder work begins.

---

# 2. Scope

### IN scope

1. Fix `/competitors` — replace the copy-paste bug with a real,
   honest, minimal page aggregating `keyCompetitors` across the
   signed-in user's own persisted projects.
2. `/projects/[id]` — a new, ownership-enforced project detail route,
   reusing `DecisionReport` directly against a project's stored
   `profile`/`verification`.
3. Make `RecentProjectsPanel`, `ReportHistoryPanel`, and `/projects`'s
   own cards link to `/projects/[id]`.
4. Dashboard search — the Header's search input becomes real, resolving
   to a filtered view on `/projects`.
5. Replace `/reports`, `/research`, `/templates`, `/settings` with
   honest, on-brand "coming soon" pages (not full features).
6. Add `error.tsx` boundaries: root, `/dashboard` segment, `/projects`
   segment.
7. Wire `components/layout/Navbar.tsx`'s "Sign In" and "Get Started"
   buttons to real destinations, and remove any remaining dead/
   placeholder behavior on those two specific controls.

### OUT of scope (explicit)

- `/pricing` — still a stub after this milestone, per your explicit
  scope boundary; the Navbar's `Pricing` nav link is therefore left
  exactly as-is (`href="#"`), not pointed at `/pricing`, so as not to
  touch anything pricing-adjacent.
- `components/layout/Navbar.tsx`'s `Features`, `Blog`, `Contact` nav
  links, and `components/landing/Hero.tsx`'s identical dead "Get
  Started"/"Live Demo" buttons — not named in your addendum; wiring
  them would require net-new destination pages (a `/features`, a
  `/blog`), which is feature work, not polish, and isn't included here.
- Testing & CI, rate limiting, request-size limits, Startup Builder,
  real search-provider integration, profile management, notifications,
  multi-user collaboration — all explicitly named non-goals in your
  instruction, restated in full in Section 4.
- Any change to RLS, ownership enforcement mechanics, or the `projects`
  schema — Milestone 27c's territory, reused here, not modified.
- Any change to `/dashboard/analysis`'s public accessibility or the
  anonymous-analysis flow.

**No ambiguous boundary:** anything not in Section 3 is a non-goal.

---

# 3. Deliverables

1. **`app/competitors/page.tsx`** — rewritten. Server Component,
   protected (middleware already covers `/competitors`? — **no**, it
   doesn't; see Section 6, this milestone adds it to `PROTECTED_PATHS`).
   Calls `getCurrentUser()` + `listProjects(user.id)`, aggregates every
   project's `profile.keyCompetitors`, deduplicates by company `name`,
   and renders one card per unique competitor listing which project(s)
   mentioned them. Honest `EmptyState` if the user has no projects with
   any competitor data yet (expected today, since no real search-provider
   credentials are configured in this environment — not fabricated to
   look otherwise).
2. **`lib/services/projects.ts`** gains `getProjectById(id: string,
   userId: string): Promise<Project | null>` — same tolerant-read
   convention as `listProjects` (never throws; a malformed row, a
   missing row, and a row owned by someone else are all indistinguishable
   `null` results to the caller, deliberately — see Section 9).
3. **`app/projects/[id]/page.tsx`** — new. Calls `getCurrentUser()`
   (redirect to `/login?redirectTo=...` if absent, reusing Milestone
   28's own mechanism) then `getProjectById(id, user.id)`; calls
   `notFound()` if `null`. Renders the project's title/date plus
   `<DecisionReport profile={project.profile} verification={project.verification} />`
   — the exact same component the live analysis flow already uses.
4. **`RecentProjectsPanel.tsx`** — each row becomes a `<Link
   href={`/projects/${project.id}`}>`, replacing the current plain
   `<div>`. Comment referencing "no project detail route" removed.
5. **`ReportHistoryPanel.tsx`** — the "Selected" panel's "Full historical
   report viewing is coming soon" text is replaced with a real `<Link>`
   to `/projects/[id]`.
6. **`app/projects/page.tsx`** — each card becomes a `<Link>` to
   `/projects/${project.id}`; also reads `searchParams.q` and filters
   the fetched project list by case-insensitive substring match on
   `title` before rendering, showing an honest "No projects match '{q}'"
   state (via `EmptyState`) when a search yields nothing, with a
   "Clear search" link back to `/projects`.
7. **`components/dashboard/shell/Header.tsx`** — the search `<Input>`
   becomes a real, controlled `<form>` (client-side state, submit on
   Enter) navigating to `/projects?q=<encoded term>`. Reuses the exact
   in-progress-analysis confirmation guard `ProfileMenu` already
   implements (Milestone 28) — reading the same `useSessionStore`, no
   new mechanism — since submitting a search is also a navigation that
   could discard an active analysis.
8. **`app/reports/page.tsx`, `app/research/page.tsx`,
   `app/templates/page.tsx`, `app/settings/page.tsx`** — each rewritten
   to a small Server Component using the existing `SectionHeader` +
   `EmptyState` shared components, with a real, specific, honest
   description of what the page will eventually do — not a bare `<h1>`,
   and not a built feature.
9. **`app/error.tsx`** (new, root-level), **`app/dashboard/error.tsx`**
   (new), **`app/projects/error.tsx`** (new) — each a minimal, on-brand
   Client Component per the Next.js App Router `error.tsx` convention
   (receives `error`/`reset`, shows a message + "Try again" button).
10. **`middleware.ts`** — `/competitors` added to `PROTECTED_PATHS`
    (it now reads the signed-in user's own projects, so it needs the
    same protection `/dashboard`/`/projects` already have).
11. **`components/layout/Navbar.tsx`** — the `<Button variant="ghost">
    Sign In</Button>` becomes `<Button variant="ghost" render={<Link
    href="/login" />}>Sign In</Button>`; the `<Button>Get
    Started</Button>` becomes `<Button render={<Link
    href="/dashboard/analysis" />}>Get Started</Button>`. This is this
    app's own `components/ui/button.tsx` (a Base UI, not shadcn/Radix,
    primitive — no `asChild`) composed via its `render` prop, the exact
    pattern already used for `Button`+`Link` elsewhere (e.g.
    `RecentProjectsPanel.tsx`, `DashboardWelcome.tsx`,
    `ProfileMenu.tsx`'s `MenuItem`). No other line in this file changes.

    *Why `/dashboard/analysis` and not `/signup`:* Milestone 27
    deliberately made anonymous analysis a first-class, approved
    product decision — a visitor can already run a full analysis with
    no account. "Get Started" pointing straight at that experience
    (try Atlas AI immediately) is the lower-friction choice directly
    supported by an existing, named product decision, rather than a
    signup wall this codebase has never required for that flow. `Sign
    In` is unambiguous — it goes to `/login`, the one real
    authentication entry point, unchanged from Milestone 27's own
    convention.

Nothing else changes.

---

# 4. Non-Goals

Explicitly **not** implemented in this milestone, restating your own
list in full:

- Testing & CI (a later, separately-scoped milestone).
- Rate limiting or request-size limits on any route.
- Any Startup Builder capability (Execution Plan, Weekly Tasks,
  Validation, MVP, Launch).
- Real search-provider integration — `/competitors`' honest-empty state
  is expected and correct until that separate milestone happens.
- Profile management, editable display names, avatars — unchanged from
  Milestone 28's own "Future Identity" boundary; `/settings` remains a
  stub, not a real settings page.
- Notifications — `NotificationsMenu` is untouched.
- Multi-user collaboration, teams, or shared project access.
- `/pricing` (still a stub), the Navbar's `Features`/`Pricing`/`Blog`/
  `Contact` links, and `Hero.tsx`'s dead CTAs — per Section 2's explicit
  boundary; only the Navbar's `Sign In`/`Get Started` buttons are in
  scope.
- Any new knowledge-platform work, any change to `DecisionProfile`'s
  schema, any change to RLS policies or the `projects` table.
- A rich, dedicated "Competitor Intelligence Hub" — `/competitors`'
  aggregation view is deliberately minimal (Deliverable 1), not a new
  platform-level feature.

---

# 5. User Flows

### Flow A — Authenticated user browses their projects and opens one

1. Visits `/projects` (or `/dashboard`'s Recent Projects panel).
2. Clicks a project card/row → navigates to `/projects/{id}`.
3. `getProjectById` confirms ownership; the page renders the exact same
   `DecisionReport` the user saw live when the analysis first completed.
4. If they instead craft a URL to a project id that isn't theirs (or
   doesn't exist), they see the same, generic "not found" outcome
   either way (Section 9) — never a distinguishing error.

### Flow B — Authenticated user searches for a project

1. From any `/dashboard/*` page, types a term into the Header's search
   box and presses Enter.
2. **No analysis in progress:** navigates immediately to
   `/projects?q=<term>`; the page shows only matching projects, with a
   visible "Showing results for '{term}' · Clear" affordance.
3. **Analysis in progress:** the same native confirmation Milestone 28
   introduced for sign-in/sign-out fires before navigating away.
4. A search matching nothing shows an honest "No projects match" state,
   not a blank page.

### Flow C — Anonymous visitor clicks "Competitors" in the sidebar

1. `/competitors` is now in `PROTECTED_PATHS` — middleware redirects
   them to `/login?redirectTo=/competitors`, exactly like `/dashboard`
   or `/projects` today.

### Flow D — Authenticated user with no competitor data visits `/competitors`

1. Sees an honest `EmptyState` ("No competitors found yet" or similar),
   not a blank page and not a fabricated example — consistent with
   every other honest-absence state already established across the
   Decision Report cards.

### Flow E — A visitor lands on any of the four remaining stub pages

1. Sees a real, styled, on-brand page stating clearly that the feature
   is coming, not a bare unstyled heading.

### Edge case — a Server Component error occurs on `/dashboard`, `/projects`, or elsewhere

1. The nearest `error.tsx` boundary catches it, shows a clear message
   and a "Try again" action, instead of Next.js's generic default error
   UI or a blank page.

### Edge case — `/projects/[id]`'s `id` doesn't correspond to any real
row (typo, deleted, or someone else's id guessed)

1. `getProjectById` returns `null` in every one of these cases,
   indistinguishably; the page calls `notFound()`, rendering the
   standard 404 experience.

### Flow F — Visitor uses the landing page Navbar

1. Clicks "Sign In" → lands on `/login`, same page reached via any
   other protected-route redirect.
2. Clicks "Get Started" → lands on `/dashboard/analysis` and can begin
   an analysis immediately, with no account.
3. If already signed in, middleware's existing `AUTH_PATHS` redirect
   sends them from `/login` straight to `/dashboard` — unchanged,
   pre-existing behavior, not a new case this milestone introduces.

---

# 6. Architecture

### Frontend changes

- Three components (`RecentProjectsPanel`, `ReportHistoryPanel`,
  `/projects`'s cards) gain a `<Link>` wrapper each — no new state, no
  new logic, purely presentational.
- `Header.tsx`'s search becomes the first genuinely new client-side
  interaction this milestone introduces — a controlled input plus a
  `router.push()` on submit, reusing the exact confirmation-guard
  pattern already proven in `ProfileMenu` (Milestone 28) rather than
  inventing a second one.
- Four stub pages and three new `error.tsx` files are new but trivial
  Server/Client Components respectively, built entirely from existing
  shared primitives (`SectionHeader`, `EmptyState`).
- `Navbar.tsx`'s two buttons gain a destination each via this app's
  `Button`'s existing `render={<Link .../>}` composition (confirmed
  already in use in `RecentProjectsPanel.tsx`, `DashboardWelcome.tsx`,
  `ProfileMenu.tsx`) — not a new interaction pattern, no new client
  state, no `"use client"` needed (`Navbar` stays a Server Component).

### Backend / services changes

- **One new function**: `getProjectById(id, userId)` in
  `lib/services/projects.ts`, following the exact pattern
  `listProjects` already established (same client, same `fromRow`
  mapping, same tolerant-null convention). No new file, no new pattern.

### APIs

**None, new or changed.** `/projects/[id]` is a Server Component
reading directly via the services layer, exactly like every other page
in this application — consistent with `CLAUDE.md`'s own architecture
(a route/page calls a service; it does not need its own API endpoint
for a read only its own render needs).

### Database / Supabase usage

**No schema change.** `getProjectById` is a `SELECT ... WHERE id = ...
AND owner_id = ...`, covered entirely by the existing `projects_select_own`
RLS policy (Milestone 27c) — no new policy needed, since fetching *one*
row a user owns is a strict subset of what that policy already permits.

### Caching

None introduced. `/projects` with a `?q=` param is still a plain
Server Component render, not a new caching layer.

### Authentication impact

`/competitors` moves from unprotected to protected — the only
authentication-surface change in this milestone, and a straightforward
addition to the existing `PROTECTED_PATHS` set (Milestone 27b), not a
new mechanism.

### Security impact

- **Enumeration resistance is the one real design decision here:**
  `getProjectById` must not let a caller distinguish "this project
  doesn't exist" from "this project exists but isn't yours" — both
  return `null`, both result in the identical `notFound()` page. This
  is a deliberate application-layer choice on top of RLS (which already
  makes a not-owned row unreadable at the database level, returning an
  empty result set rather than an error) — the two layers agree, not by
  accident.
- The new search flow reads only already-owned data (`listProjects`'s
  existing RLS-scoped query); the `q` param is used only for an
  in-memory substring filter, never interpolated into a query string or
  rendered unescaped — no injection surface.

---

# 7. Data Model

**No schema changes, no new tables, no new columns, no new migration.**
Every deliverable in this milestone reads fields (`profile`,
`verification`, `title`, `createdAt`, `keyCompetitors`) that already
exist and are already validated by existing schemas
(`ProjectSchema`, `DecisionProfileSchema`, `CompanyProfileSchema`).

---

# 8. API Contract

**No new or changed API route.** Every new read in this milestone goes
through a Server Component calling a service function directly — the
same pattern `/dashboard` and `/projects` already use. There is nothing
resembling a request/response contract to specify beyond what
`getProjectById(id, userId): Promise<Project | null>`'s own signature
already states.

---

# 9. Security Review

- **Authentication requirement:** `/competitors` and `/projects/[id]`
  both require a signed-in user — the former via middleware
  (`PROTECTED_PATHS`), the latter via the same per-page
  `getCurrentUser()` + redirect pattern `/dashboard`/`/projects`
  already use.
- **Authorization requirement — the core concern of this milestone:**
  `getProjectById` must filter by `owner_id` explicitly (Layer 1,
  application-level), with RLS (Layer 2, database-level) as the
  independent backstop — the same two-layer discipline Milestone 27c
  established, applied to a single-row read instead of a list read.
- **RLS implications:** none new — the existing `projects_select_own`
  policy already covers this exact access pattern.
- **Abuse scenario considered and closed:** enumerating project ids by
  trying sequential/guessed UUIDs — closed by RLS alone regardless of
  application code (a non-owner's query returns zero rows at the
  database level, no matter what id is tried), and further closed by
  treating "not found" and "not yours" identically at the UI layer, so
  even a confirmed *existing* id belonging to someone else reveals
  nothing beyond "not found."
- **Privacy considerations:** the `/competitors` aggregation only ever
  reads the *signed-in user's own* projects — never another user's
  competitor data, consistent with every other RLS-scoped read in this
  app.

---

# 10. Performance Review

- **Database queries:** `getProjectById` is one additional, indexed
  (`id` is the primary key) query — negligible. `/competitors`'s
  aggregation reuses the existing `listProjects` call already made
  elsewhere — no new query shape, just new in-memory processing of
  data already fetched the same way `/dashboard` fetches it.
- **Client rendering:** the new search form and confirmation guard are
  both simple, low-frequency, user-initiated interactions — negligible.
- **Server rendering:** `/competitors`'s deduplication logic runs over
  a single user's own project list (realistically small, per Milestone
  27's own scale assumptions) — a plain in-memory `Map` keyed by
  competitor name, not a database-level aggregation; fine at today's
  scale, worth revisiting only if a user's project count ever grows
  large (the same, already-accepted scale assumption `listProjects`
  itself carries).
- **Caching opportunities:** none taken, none needed at this scale.
- **Scalability concerns:** none new beyond what Milestone 27 already
  named (unmeasured at scale, not urgent).

---

# 11. Risks

- **Enumeration/information-leakage risk on `/projects/[id]`** — the
  single highest-stakes correctness requirement in this milestone.
  Mitigated by the explicit "null for anything not exactly yours"
  design (Section 9), but worth a dedicated verification step (Section
  13), not just code review.
- **UX risk:** the search-triggered confirmation guard could feel like
  friction if triggered too eagerly — mitigated by reusing the exact,
  already-tuned condition `ProfileMenu` uses (`status === "starting"`
  or a non-terminal `view`), not a new, untested heuristic.
- **Scope-boundary risk:** `/competitors`' aggregation view could be
  mistaken for an invitation to build a richer feature later without
  re-scoping — mitigated by this document's own explicit Non-Goals
  statement ("not a new platform-level feature").
- **Migration risk:** none — no schema touched.
- **Rollback plan:** every change here is additive (new route, new
  links, new pages) or a narrow, isolated rewrite (the four stub
  pages, `/competitors`) — reverting the commit fully restores prior
  behavior.
- **Compatibility risk:** none identified — no existing component's
  props contract changes in a breaking way; `RecentProjectsPanel`/
  `ReportHistoryPanel`/`/projects` gain a `<Link>` wrapper around
  existing markup, not a props-shape change.
- **Scope-creep risk on the Navbar addendum:** `Hero.tsx` has an
  identical dead "Get Started" button sitting one component away from
  the one being fixed — a real temptation to "fix it while we're
  here." Mitigated by this document naming it explicitly as excluded
  (Section 2, Section 4) rather than leaving it for an implementer to
  decide in the moment.

---

# 12. Acceptance Criteria

1. [ ] `/competitors` no longer renders `ProjectsPage`'s content;
   redirects to `/login` when signed out.
2. [ ] `/competitors` shows an honest empty state when the signed-in
   user has no competitor data yet, and correctly lists deduplicated
   competitors when they do.
3. [ ] `/projects/[id]` renders the correct project's `DecisionReport`
   for its owner.
4. [ ] `/projects/[id]` shows the standard "not found" experience for:
   a nonexistent id, a malformed id, and an id belonging to a different
   user — verified as three separate, indistinguishable cases, not
   assumed identical from code review alone.
5. [ ] Cards/rows in `/projects`, `RecentProjectsPanel`, and
   `ReportHistoryPanel` all link to the correct `/projects/{id}`.
6. [ ] Submitting a search term navigates to `/projects?q=...` and
   shows only matching projects.
7. [ ] A search yielding zero results shows an honest empty state, not
   a blank list.
8. [ ] Submitting a search while an analysis is in progress shows the
   same confirmation guard as Milestone 28's sign-in/sign-out actions.
9. [ ] `/reports`, `/research`, `/templates`, `/settings` each show a
   real, styled, honest "coming soon" page — no bare `<h1>`.
10. [ ] Visiting `/dashboard`, `/projects`, or a page with no more
    specific boundary while forcing a render error shows the correct
    `error.tsx` fallback, not Next.js's generic default.
11. [ ] `Navbar.tsx`'s "Sign In" button navigates to `/login`; "Get
    Started" navigates to `/dashboard/analysis`; both are real links,
    not decorative buttons.
12. [ ] `/pricing`, `Navbar.tsx`'s `Features`/`Pricing`/`Blog`/`Contact`
    links, and `Hero.tsx` are all confirmed unchanged (`git diff` shows
    zero modification to any of them).
13. [ ] `tsc --noEmit` and `eslint` both pass with zero new errors.
14. [ ] `next build` succeeds; the route count increases by exactly one
    (`/projects/[id]`) plus whatever `error.tsx` files add to the build
    manifest, with no other unexpected route change.
15. [ ] No table, column, or RLS policy changed — confirmed via `git
    diff` touching zero files under `supabase/migrations/`.

---

# 13. Verification Plan

**Manual tests:**
- Open a real project's detail page as its owner — confirm the report
  renders identically to what was seen live.
- Attempt to open another account's project id directly (requires a
  second test account, same limitation named in Milestone 27's own
  verification) — confirm identical "not found" behavior to a
  nonexistent id.
- Search for a real project's title fragment — confirm it appears;
  search for nonsense — confirm the honest empty state.
- Trigger the search-while-busy confirmation guard.
- Visit each of the four rewritten stub pages.
- Force a render error (e.g., a temporary throw) under each new
  `error.tsx` boundary to confirm it actually catches, then remove the
  forced throw — never left in the codebase.
- From the signed-out landing page, click "Sign In" and confirm arrival
  at `/login`; click "Get Started" and confirm arrival at
  `/dashboard/analysis`, with an analysis actually runnable from there
  with no account.

**Automated tests:** none — unchanged, not introduced by this milestone
(explicitly deferred, per your instruction).

**Production verification:** not applicable beyond the existing
Supabase project already used throughout this project's verification.

**Edge-case testing:**
- A project whose `keyCompetitors` array is empty — confirm it's simply
  omitted from `/competitors`' aggregation, not shown as a broken entry.
- Two projects mentioning the same competitor by exact name — confirm
  deduplication groups them, listing both source projects.
- A search term containing special regex/HTML characters — confirm the
  substring match doesn't throw and nothing is rendered unescaped.

**Regression testing:** re-confirm the full Milestone 27c/28 checklist
(anonymous analysis flow, authenticated persistence, ownership
isolation, identity display) is unaffected — this milestone should be
additive-only to that surface.

---

# 14. Implementation Plan

**Sub-milestone 29.1 — Project detail route + service function**
- *Purpose:* the foundational read path everything else in this
  milestone builds on.
- *Files:* `lib/services/projects.ts`, `app/projects/[id]/page.tsx`.
- *Outcome:* a project's own page is reachable and correctly
  ownership-scoped, even before anything links to it yet.
- *Dependencies:* none.

**Sub-milestone 29.2 — Wire the links**
- *Purpose:* make 29.1's route actually reachable from the UI.
- *Files:* `RecentProjectsPanel.tsx`, `ReportHistoryPanel.tsx`,
  `app/projects/page.tsx`.
- *Outcome:* Flow A fully working.
- *Dependencies:* 29.1.

**Sub-milestone 29.3 — Dashboard search**
- *Purpose:* the one genuinely new interactive feature in this
  milestone.
- *Files:* `components/dashboard/shell/Header.tsx`,
  `app/projects/page.tsx` (search-param handling, layered onto 29.2's
  changes to the same file).
- *Outcome:* Flow B fully working.
- *Dependencies:* 29.2 (search results render on the same page 29.2
  already updated).

**Sub-milestone 29.4 — Fix `/competitors`**
- *Purpose:* the other confirmed, currently-live bug.
- *Files:* `app/competitors/page.tsx`, `middleware.ts`.
- *Outcome:* Flows C, D fully working.
- *Dependencies:* none technically; sequenced after the project-read
  pattern (29.1) is established, since it reuses the identical
  `listProjects` call.

**Sub-milestone 29.5 — Stub pages + error boundaries**
- *Purpose:* the remaining, independent, lowest-risk items.
- *Files:* `app/reports/page.tsx`, `app/research/page.tsx`,
  `app/templates/page.tsx`, `app/settings/page.tsx`, `app/error.tsx`,
  `app/dashboard/error.tsx`, `app/projects/error.tsx`.
- *Outcome:* Flows E and both edge cases fully working.
- *Dependencies:* none — could run in parallel with any other
  sub-milestone; sequenced last only because it's the least coupled to
  everything else.

**Sub-milestone 29.6 — Wire the Navbar's Sign In / Get Started buttons**
- *Purpose:* the approved scope addendum — a two-line, isolated
  product-polish fix.
- *Files:* `components/layout/Navbar.tsx`.
- *Outcome:* Flow F fully working; no other line in the file touched.
- *Dependencies:* none — fully independent of every other
  sub-milestone; could run first, last, or in parallel.

Each sub-milestone gets its own `tsc`/`eslint`/manual-check pass before
the next begins, per this project's established discipline.

---

# 15. Final Review — Self-Critique

- **Unnecessary complexity:** none found. Every deliverable reuses an
  existing schema, existing component, or existing pattern
  (`DecisionReport`, the RLS-scoped read pattern, Milestone 28's
  confirmation guard, `EmptyState`/`SectionHeader`). Nothing here
  invents a new mechanism.
- **Duplicated logic:** the `PROTECTED_PATHS` addition for
  `/competitors` and the confirmation-guard reuse in `Header.tsx` are
  both explicit reuses, not copies — flagged explicitly in the
  Architecture section so an implementer doesn't accidentally
  reimplement either.
- **Future maintenance problems:** `/competitors`' aggregation logic
  (dedup by name, in-memory) is the one piece of genuinely new logic in
  this milestone. It's simple today because real search-provider data
  doesn't exist yet to produce messy near-duplicate names; a future
  milestone wiring real credentials (explicitly out of scope here)
  will likely need to revisit this dedup logic's robustness. Named here
  so it isn't a surprise later.
- **Security concerns:** the `getProjectById` enumeration-resistance
  requirement is real and correctly identified as this milestone's
  single highest-stakes correctness point — Acceptance Criterion 4
  requires testing it as three separate cases, not assuming they behave
  the same from a read of the code alone.
- **Architectural inconsistencies:** none found — this milestone
  deliberately introduces zero new patterns; every choice traces back
  to something Milestones 26–28 already established.
- **Open items surfaced, not silently resolved:** `/pricing`,
  `Hero.tsx`'s identical dead CTAs, and the Navbar's remaining
  `Features`/`Pricing`/`Blog`/`Contact` links all remain explicitly out
  of scope per your confirmation, not because they aren't real gaps,
  but because you set that boundary directly. Only the two named
  Navbar buttons were added.
- **Scope-change discipline:** the Navbar addendum was accepted because
  it named exact components and an exact behavior, stayed within
  Theme B's own "product polish, not new feature" framing, and didn't
  touch `/pricing`. It's recorded here as a scope amendment to this
  same design, not folded silently into the original Section 2 as if
  it had always been there — Section 2 and the Pre-Design Audit both
  show it as an addendum for that reason.

---

*End of design specification. Awaiting review before Sub-milestone 29.1
begins. No code has been written or modified.*
