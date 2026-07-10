# Atlas AI — Dashboard Foundation

This document describes the new dashboard shell and Dashboard Home
introduced in Milestone 2.1. It's a UI-architecture document, not a
business-logic one — nothing here touches the Analysis Pipeline, the
services layer, the API, or the database. See `ARCHITECTURE.md` for the
system-wide picture and `PIPELINE.md` for the AI analysis pipeline this
explicitly does not modify.

**Status: live.** `/dashboard` now renders the new Dashboard Home, wrapped
in the new shell. The existing AI analyze tool (`AIWorkspace`, internally
unmodified) moved to `/dashboard/analysis`, also wrapped in the new shell.
Every other existing route is unchanged, including its lack of any shared
dashboard chrome — see "Cutover Status" below.

---

## Component Hierarchy

```
app/dashboard/layout.tsx                     (new — applies AppShell)
  components/dashboard/shell/AppShell.tsx     (new)
    components/dashboard/shell/Sidebar.tsx     (new)
      components/dashboard/shell/SidebarNavItem.tsx
    components/dashboard/shell/Header.tsx        (new)
      components/dashboard/shell/NotificationsMenu.tsx
      components/dashboard/shell/ProfileMenu.tsx
        components/shared/ThemeToggle.tsx

app/dashboard/page.tsx                        (rewritten — Dashboard Home)
  components/dashboard/home/DashboardHome.tsx   (new)
    components/dashboard/home/DashboardWelcome.tsx
    components/dashboard/home/DashboardStats.tsx
    components/dashboard/home/RecentProjectsPanel.tsx
    components/dashboard/home/RecentActivityPanel.tsx

app/dashboard/analysis/page.tsx               (new)
  components/dashboard/AIWorkspace.tsx          (UNCHANGED — only relocated)

app/templates/page.tsx                        (new stub, matches the
                                                 existing pricing/reports/
                                                 research/settings pattern)
```

Shared primitives introduced alongside the shell (used by more than one of
the components above, or intentionally available for reuse beyond this
sprint):

```
components/shared/Logo.tsx          Atlas AI wordmark (Header today;
                                      Navbar.tsx's own copy is untouched —
                                      out of scope this sprint)
components/shared/ThemeToggle.tsx   light/dark switch (ProfileMenu today)
components/ui/avatar.tsx            Avatar/AvatarImage/AvatarFallback,
                                      wrapping @base-ui/react/avatar
components/ui/menu.tsx              Menu/MenuTrigger/MenuContent/MenuItem/
                                      MenuSeparator/MenuGroupLabel, wrapping
                                      @base-ui/react/menu
```

`components/shared/IconBadge.tsx` and `components/shared/SectionHeader.tsx`
(from Sprint 3) are reused as-is in `DashboardStats`, `RecentActivityPanel`,
and `AnalysisOverview`'s existing usage — no changes to either.

### What did not change

- `components/dashboard/DashboardLayout.tsx`, `Sidebar.tsx`, `Topbar.tsx`,
  `RightPanel.tsx`, `Header.tsx` — the old shell. No longer referenced by
  `/dashboard` (which used `DashboardLayout` before this sprint), but kept
  in place rather than deleted, consistent with this project's standing
  practice of never removing working code without explicit instruction.
  They join `DashboardShell.tsx`, `StatsCards.tsx`, `RecentProjects.tsx`,
  and `AIProgress.tsx` as superseded-but-kept components.
- `components/dashboard/AIWorkspace.tsx` — byte-for-byte unchanged. Moved
  from being rendered at `/dashboard` to `/dashboard/analysis`.
- `lib/analysis/`, `lib/services/`, `app/api/`, `lib/supabase.ts`,
  `lib/store/`, every existing schema and hook — untouched.
- `/projects`, `/research`, `/competitors`, `/reports`, `/settings` — pages
  and behavior unchanged.

---

## Layout

`app/dashboard/layout.tsx` is a new Next.js segment layout applying
`AppShell` to everything under `/dashboard`. `AppShell` renders:

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (persistent, collapsible)  │  Header               │
│                                     ├───────────────────────┤
│                                     │                        │
│                                     │   {children}           │
│                                     │   (page content)       │
│                                     │                        │
└─────────────────────────────────────────────────────────┘
```

`Sidebar` and `Header` are siblings inside a flex row/column split:
`Sidebar` occupies the left rail (desktop) or a drawer overlay (mobile);
`Header` + page content stack vertically in the remaining space, with
`<main>` scrolling independently of the fixed header.

State ownership, deliberately split by who actually needs it:
- **Desktop collapse** (`collapsed` in `Sidebar.tsx`) — local to `Sidebar`,
  persisted to `localStorage`, read via a lazy `useState` initializer (not
  an effect — see "A note on the stricter lint rules" below).
- **Mobile drawer open/closed** (`mobileNavOpen` in `AppShell.tsx`) — lifted
  to `AppShell` because both `Header` (the hamburger trigger) and `Sidebar`
  (the panel + backdrop) need it. Nothing else needs this state, so it
  isn't lifted any further.
- **Theme** (`ThemeToggle.tsx`) — read from the DOM (`document.documentElement`
  class), not from React state shared across components; any component
  that needs to know the theme can read the same class directly, so there's
  no theme context/store to keep in sync.

---

## Navigation

The sidebar's nav items and where they point:

| Label | Href | Status |
|---|---|---|
| Dashboard | `/dashboard` | New Dashboard Home, wrapped in the new shell |
| Projects | `/projects` | Existing route, unchanged, **not** wrapped in the new shell |
| AI Analysis | `/dashboard/analysis` | `AIWorkspace`, unchanged, wrapped in the new shell |
| Market Research | `/research` | Existing stub route, unchanged, not wrapped |
| Competitors | `/competitors` | Existing route (including its known content bug — see `ARCHITECTURE.md`), unchanged, not wrapped |
| Reports | `/reports` | Existing stub route, unchanged, not wrapped |
| Templates | `/templates` | **New** stub page (matches the existing pricing/reports/research/settings stub pattern) so the link isn't a 404 |
| Settings | `/settings` | Existing stub route, unchanged, not wrapped |

Active-link detection is exact-match on `pathname` (`SidebarNavItem`'s
`active` prop), consistent with the old sidebar's approach.

---

## Responsive Behavior

**Desktop (`md:` and above, ≥768px).** Sidebar is persistent and part of
normal flex layout flow. It can be collapsed to an icon-only rail (76px)
or expanded (240px) via the toggle at its bottom — the transition is
animated with `framer-motion` (an existing, previously-unused dependency).
Collapsed state persists across reloads via `localStorage`.

**Tablet.** Follows the same breakpoint as desktop today — the sidebar
doesn't get a distinct tablet-only treatment. `DashboardStats`'s grid steps
from 2 columns (`sm:`) to 4 (`xl:`), and `RecentProjectsPanel`/
`RecentActivityPanel` step from a stacked column to a 2-column grid at
`xl:`, which naturally gives tablet widths a single-column stats/panel
layout with the sidebar still present.

**Mobile (below `md:`, <768px).** The persistent sidebar is hidden
entirely. `Header` shows a hamburger button that opens `Sidebar` as a
fixed-position overlay drawer (240px wide) with a click-to-dismiss
backdrop. The drawer always renders fully expanded — collapsing doesn't
make sense in a temporary overlay the user is about to close. Tapping a
nav item closes the drawer (`onNavigate` callback) so the next page isn't
hidden behind it.

---

## Dark Mode

`globals.css`'s existing oklch light/dark token system (defined since the
project's shadcn scaffold, previously almost entirely unused) is what
every new component in this sprint is built on — `bg-background`,
`text-foreground`, `bg-card`, `border-border`, `bg-sidebar`,
`text-sidebar-foreground`, `bg-sidebar-accent`, `bg-popover`, `bg-muted`,
etc., rather than raw Tailwind colors. This is a deliberate, real adoption
of the tokens CLAUDE.md's Tailwind Rules flagged as underused — not a
drive-by migration of unrelated code, since it's scoped to the new
components this sprint introduces.

A working toggle (not just passive readiness) lives in `ProfileMenu` via
`ThemeToggle`, which flips a `dark` class on `<html>`. `app/layout.tsx`
gained a small inline bootstrap `<script>` (following the
[Next.js-documented pattern for this exact version](https://nextjs.org)
found in this repo's own bundled docs at
`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`)
that reads the saved preference (or system preference, as a fallback) and
applies the class before first paint, so there's no flash of the wrong
theme on a hard load. `suppressHydrationWarning` on `<html>` is required
alongside it, per that same guide.

The rest of the app (landing page, old dashboard components, existing
stub pages) still uses raw Tailwind colors and isn't dark-mode aware today
— that's unchanged, out of scope, and a natural candidate for a future
sprint once the new shell's pattern is proven out.

---

## Accessibility

- Every icon-only control (mobile hamburger, notifications bell, sidebar
  collapse toggle, theme toggle) has an `aria-label`.
- Collapsed sidebar nav items keep their label in the DOM via `sr-only`
  text plus a native `title` attribute, rather than disappearing from the
  accessibility tree.
- The active nav item uses `aria-current="page"`.
- `NotificationsMenu` and `ProfileMenu` are built on `@base-ui/react`'s
  `Menu` primitive (already a project dependency, previously only used for
  `components/ui/button.tsx`) rather than a hand-rolled dropdown — it
  provides focus trapping, keyboard navigation (arrow keys, Escape), and
  correct ARIA roles out of the box, which a hand-rolled implementation
  would have to reproduce and would be easy to get subtly wrong.
- Focus states rely on the same shadcn `focus-visible:ring-*` tokens
  already used by `components/ui/button.tsx` — nothing overrides them away.
- The global search input has a real `aria-label`, even though the search
  itself isn't functional yet (see Future Extension Points) — a decorative
  input without a label would be a regression for screen reader users
  regardless of whether the feature behind it exists.

---

## Honesty About Data

Per this project's standing principle (`CLAUDE.md`, and Atlas AI's own
"never invent fake facts" system prompt applied to its own UI): nothing in
the new Dashboard Home fabricates data.

- **Statistics cards** are computed from the real `listProjects()` result
  (total count, average score, highest score, projects analyzed in the
  last 7 days) — not hardcoded demo numbers like the old, now-superseded
  `StatsCards.tsx`/`AIMetrics.tsx` were.
- **Recent Projects** shows the real, most-recent rows from the `projects`
  table, with an honest empty state ("No projects yet") when there are
  none.
- **Recent Activity** has no dedicated event/activity log in the database
  (adding one would be a new data model — out of scope for a UI-only
  sprint) — so it derives real activity entries from the same project
  data ("Analysis completed for X, 2 hours ago") rather than inventing a
  fake activity feed.
- **Notifications** has no backing data source at all yet, so it shows an
  honest empty state rather than fabricated notification items.

---

## A Note on the Stricter Lint Rules

This Next.js version ships React Compiler-era ESLint rules
(`react-hooks/purity`, `react-hooks/set-state-in-effect`) stricter than
what's in most training data — consistent with `AGENTS.md`'s warning about
this not being a familiar Next.js build. Two patterns this sprint had to
account for:

- **No impure calls (`Date.now()`, `Math.random()`) directly inside a
  component's render body.** `DashboardStats.tsx` moved its `Date.now()`
  call into a plain helper function (`countProjectsThisWeek`) defined
  outside the component, rather than inline in the component body.
- **Don't set state synchronously inside a `useEffect` just to read
  `localStorage`/the DOM on mount.** `Sidebar.tsx`'s collapse state and
  `ThemeToggle.tsx`'s current theme both switched from
  `useState` + `useEffect` to a **lazy `useState` initializer function**
  (guarded for SSR with `typeof window === "undefined"` /
  `typeof document === "undefined"`), matching the pattern in this
  repo's own bundled Next.js docs for syncing React state with
  externally-persisted values.

---

## Future Extension Points

- **Wrap the remaining routes in the shell.** `/projects`, `/research`,
  `/competitors`, `/reports`, `/templates`, and `/settings` don't have the
  new sidebar/header today — clicking one of those sidebar links
  navigates *away* from the shell entirely. This isn't a regression (none
  of those pages had any shared chrome before this sprint either), but a
  cohesive dashboard should eventually wrap them too. Doing so needs a
  decision on whether to move those page files under a shared layout
  (Next.js route groups, e.g. `app/(dashboard)/...`) — deliberately not
  attempted this sprint to keep the change contained to exactly "the
  dashboard shell and dashboard home."
- **Project detail links.** `RecentProjectsPanel`'s rows aren't clickable
  because there's no `/projects/[id]` route yet (a known gap — see
  `ARCHITECTURE.md`'s Roadmap Milestone 3). Once it exists, each row
  becomes a real link.
- **Functional global search.** The header's search input is real,
  labelled, and styled, but not wired to anything — a genuine search
  feature (indexing projects/reports/competitors) is business logic,
  explicitly out of scope this sprint.
- **A real notification/activity data model.** Both `NotificationsMenu`
  and `RecentActivityPanel` are currently backed by either nothing or by
  reusing project data. A dedicated `notifications`/`activity` table and
  service (following the existing `lib/services/projects.ts` shape) would
  let both surfaces show real, independent events instead of derived or
  empty states.
- **Extending the sidebar/header to reflect a real session.** "Yasin /
  Founder" is still hardcoded (`ProfileMenu`), matching every other part of
  the app — this resolves whenever Roadmap Milestone 4 (auth) lands.
- **Wiring the AI Pipeline into `/dashboard/analysis`.** Out of scope for
  this sprint and unrelated to it — `AIWorkspace` still calls the original
  single-call `analyzeStartup` service, exactly as before. See
  `PIPELINE.md`'s own "Cutover Status" for that separate decision.
