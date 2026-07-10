# Atlas AI — Design System

This document is the permanent design-system reference, introduced in
Milestone 2. It describes the token layer, typography, color system,
component library, motion, and accessibility conventions every visual
surface in Atlas AI should follow, and documents exactly which surfaces
have been migrated to it so far.

No business logic, API route, service, AI pipeline, Zustand store, or
route structure changed to produce this system — see "What Was Not
Touched" at the end.

---

## The Problem This Solves

An audit of the UI before this milestone (see `git log` for the exact
before/after) found, quantitatively:

- **5 competing border-radius scales** in simultaneous use (`rounded-lg`,
  `xl`, `2xl`, `3xl`, `full`) with no rule for which to use where.
- **Card padding ranging from `p-5` to `p-10`** with no consistent rhythm.
- **~150 raw Tailwind color utilities** (`text-blue-600`, `bg-gray-100`,
  `border-gray-200`, etc.) used directly in components instead of the
  semantic tokens that already existed in `globals.css` — mostly because
  `--primary` was still shadcn's generic neutral gray, not Atlas AI's
  actual brand blue, so using it would have rendered the wrong color.
- **11 files hand-rolling `<button>` markup** instead of reusing
  `components/ui/button.tsx`.
- **Three separate hand-rolled empty-state implementations** (Recent
  Projects, Recent Activity, Notifications) for the same icon + title +
  description + action shape.
- **Zero shared Input/Textarea/Card/Badge/Alert/Table/Dialog/Tooltip
  /Skeleton/Progress primitives** — every instance was bespoke.

This milestone's job was to fix the *system*, not patch each occurrence
individually — see Step 1's audit reasoning in the commit history for the
full breakdown.

---

## Design Principles

1. **One token, one meaning.** `--primary` means Atlas AI's brand blue,
   everywhere, in both themes. A component reaching for "the brand color"
   never needs to remember a hex code or a Tailwind palette name.
2. **Semantic over literal.** `bg-success`, `text-muted-foreground`,
   `border-border` describe *what a color means*; `bg-green-600`,
   `text-gray-500` describe *what it looks like today*. Prefer the former
   everywhere it's practical — see "Raw Color Exceptions" below for where
   it deliberately isn't.
3. **Primitives, not patches.** A pattern that repeats becomes a component
   in `components/ui/` or `components/shared/`, adopted everywhere it
   already existed, rather than five slightly-different hand-rolled copies.
4. **Subtle, not flashy.** Every animation in this system is a
   confirmation (a hover lift, a menu fade-in, a shimmer) — never a
   distraction. If a reviewer notices the *animation* before the content,
   it's too much.
5. **Honest data, always.** No component in this system fabricates
   numbers, activity, or content to look more finished than the app
   actually is — see each polished component's own comments for where this
   mattered (Dashboard stats, Recent Activity, Notifications).
6. **Visual work is not architecture work.** This milestone touched zero
   business logic, services, the AI pipeline, Zustand stores, API routes,
   or route structure. Every change here is additive tokens, new shared
   components, or restyled markup in already-existing files.

---

## Design Tokens

Tailwind v4's own scales (spacing, opacity, z-index, duration, the
existing `--radius-*` calc chain) already **are** Atlas AI's spacing/
radius/duration/opacity/z-index token system — the fix this milestone
made wasn't reinventing them, it was (a) actually using them consistently
and (b) filling in the two real gaps: missing semantic colors, and no
documented *rule* for which scale value to reach for. Both are covered
below.

### Color tokens (`app/globals.css`)

All defined as CSS custom properties in `:root` / `.dark`, mapped into
Tailwind utilities via the `@theme inline` block (so `bg-primary`,
`text-success`, etc. all work as ordinary utility classes):

| Token | Meaning |
|---|---|
| `background` / `foreground` | Page canvas and default text |
| `card` / `card-foreground` | Card surfaces |
| `popover` / `popover-foreground` | Menus, tooltips, dialogs |
| `primary` / `primary-foreground` | **Atlas AI's brand blue** — fixed this milestone from shadcn's generic neutral (see below) |
| `secondary` / `secondary-foreground` | Low-emphasis actions |
| `muted` / `muted-foreground` | De-emphasized surfaces/text |
| `accent` / `accent-foreground` | Hover/active surface tint |
| `destructive` | Danger/delete actions |
| `success` / `success-foreground` | **New this milestone** — positive states (score trending up, "all caught up") |
| `warning` / `warning-foreground` | **New this milestone** — caution states (risk level, "analyzed this week") |
| `info` / `info-foreground` | **New this milestone** — neutral-positive highlights (highest score) |
| `border` / `input` / `ring` | Borders, form control borders, focus rings |
| `sidebar*` | The sidebar's own surface/text/active/hover/border tokens |
| `chart-1..5` | Chart series colors — now real distinguishable hues (blue/green/amber/red/purple), not five shades of gray |

**The `--primary` fix.** Before this milestone, `--primary` was shadcn's
scaffolded default — a near-black/near-white neutral — while every actual
button, link, and active-state in the app hardcoded `bg-blue-600`
directly, because using the token would have rendered the wrong color.
`--primary` (and `--sidebar-primary`, `--ring`) now hold Atlas AI's real
brand blue in both themes (a slightly lighter blue in dark mode for
contrast against the near-black background). This is what makes "avoid
raw Tailwind colors" achievable at all — before this fix, following that
rule literally would have broken the brand color.

### Raw color exceptions

Two categories of raw Tailwind/CSS color remain, deliberately:

- **Decorative multi-stop gradients** (`DashboardWelcome`, `AtlasVerdict`,
  the Executive Summary score panel) use
  `from-primary via-indigo-600 to-purple-700`-style gradients. These are
  one-off "hero moment" treatments, not reusable semantic surfaces —
  indigo/purple don't have (and don't need) their own tokens for a
  gradient stop that exists in exactly one visual context.
- **Categorical, non-state colors** — e.g., a stat card's icon chip color
  chosen purely to visually distinguish it from its neighbors, not because
  it means "success" or "warning." These use the same success/warning/info
  tokens where the meaning genuinely fits (see `DashboardStats.tsx`), and
  fall back to the token whose *hue* fits best otherwise.

### Radius scale (rule, not a new token)

The existing `--radius-*` calc chain in `globals.css` is unchanged. The
**rule** this milestone established and applied:

| Radius | Use for |
|---|---|
| `rounded-3xl` | Outer containers — `Card`, page-level panels, hero sections |
| `rounded-2xl` | Nested content blocks inside a card, list rows, secondary panels |
| `rounded-xl` | Compact elements — icon chips, dropdown/menu popups |
| `rounded-lg` | Form controls — `Input`, `Textarea`, `Button`, nav items |
| `rounded-full` | Avatars, status dots, pill badges |

### Spacing rhythm (rule, not a new token)

- Card padding: `p-6` default, `p-7`/`p-8` for hero/emphasis surfaces.
- Icon-plus-heading rows: `gap-3`.
- Sibling card grids: `gap-6`.
- Stacked page sections: `space-y-6` to `space-y-8`.

### Motion durations (rule, not a new token)

- **150ms** — hover/press micro-interactions (button color, nav item
  background, row hover).
- **200ms** — layout-affecting transitions (sidebar collapse width,
  dialog/menu enter-exit, mobile drawer slide).
- **300ms** — card lift-on-hover (deliberately a touch slower so it reads
  as "settling," not "snapping").

### Container widths

- Dashboard shell content: full-width within the shell's padding (a dense
  app surface, not a reading-width page).
- Marketing/content pages (`app/page.tsx`'s landing sections, the
  Projects list): `max-w-7xl` / `max-w-5xl` respectively, centered.

### Icon sizes

- `h-4 w-4` (16px) — inline with text, inside buttons/badges.
- `h-5 w-5` (20px) — standalone toolbar icons (header, sidebar collapse
  toggle).
- `h-6`–`h-7` (24–28px) — inside an `IconBadge` chip.

### Z-index

- `z-50` — the mobile sidebar drawer/backdrop. Base UI's Menu/Dialog/
  Tooltip portals manage their own stacking context automatically (they
  render into `<body>`), so they don't need an app-level z-index token.

---

## Typography (`components/ui/typography.tsx`)

Geist (via `next/font`) remains the only font family — `Geist Mono` for
anything that still needs monospace. The complete scale:

| Component | Renders | Classes |
|---|---|---|
| `Display` | `h1` | `text-5xl md:text-6xl font-bold tracking-tight` |
| `H1` | `h1` | `text-4xl font-bold tracking-tight` |
| `H2` | `h2` | `text-3xl font-bold tracking-tight` |
| `H3` | `h3` | `text-2xl font-semibold` |
| `H4` | `h4` | `text-xl font-semibold` |
| `Large` | `p` | `text-lg font-medium` |
| `Body` | `p` | `text-base leading-7` |
| `Small` | `p` | `text-sm leading-6 font-medium` |
| `Caption` | `p` | `text-xs leading-5 text-muted-foreground` |
| `Label` | `label` | `text-sm font-medium leading-none` |
| `buttonTextClassName` | (a class string, not a component) | `text-sm font-medium` — for a custom button-like element that needs to match `Button`'s label typography exactly |

Every component accepts `className` and merges it via `cn()`, so a
one-off color/margin override doesn't require dropping back to a raw
`<h2>`.

---

## Color System — Where Each Token Applies

- **Primary** — the single call-to-action color: the "Analyze" buttons,
  active sidebar item, focus rings, score/score-adjacent numbers.
- **Success** — score-is-good indicators, "all caught up" states, high
  project scores in `app/projects/page.tsx`'s badge.
- **Warning** — risk indicators, "analyzed this week" stat, low-ish
  project scores.
- **Info** — a secondary highlight distinct from primary (e.g. "highest
  score" stat), so not everything reaches for blue.
- **Destructive** — reserved for genuinely destructive/error actions (not
  yet exercised anywhere live, since nothing in the app deletes data yet).
- **Muted** — every secondary/de-emphasized text and surface
  (descriptions, timestamps, placeholders, disabled states).

---

## Component Library (`components/ui/`, `components/shared/`)

All new this milestone unless noted. Every one accepts `className` and
merges via `cn()`.

| Component | File | Notes |
|---|---|---|
| `Button` | `button.tsx` | Pre-existing (Sprint 2). Extended this milestone: `render`-substituted elements (e.g. a `Link` styled as a button) now auto-default `nativeButton={false}` instead of every call site needing to remember Base UI's native-button requirement. |
| `Avatar` | `avatar.tsx` | Pre-existing (Milestone 2.1). |
| `Menu` | `menu.tsx` | Pre-existing, extended with `MenuGroup` this milestone (Base UI requires `MenuGroupLabel` to live inside a `Menu.Group` — this was a real runtime bug caught during manual verification, not just a lint/type issue). |
| `Input` | `input.tsx` | New. |
| `Textarea` | `textarea.tsx` | New. |
| `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardAction` / `CardContent` / `CardFooter` | `card.tsx` | New. The canonical `rounded-3xl border bg-card shadow-sm` container. |
| `Badge` | `badge.tsx` | New. Variants: default, secondary, success, warning, destructive, info, outline. |
| `StatusPill` | `status-pill.tsx` | New. Dot + label for live/verdict-style state — distinct from `Badge` (tags/counts). |
| `Alert` / `AlertTitle` / `AlertDescription` | `alert.tsx` | New. Same variant set as `Badge`. |
| `Tooltip` / `TooltipTrigger` / `TooltipContent` / `TooltipProvider` | `tooltip.tsx` | New, wraps `@base-ui/react/tooltip`. Used for collapsed sidebar labels. |
| `Dialog` / `DialogTrigger` / `DialogContent` / `DialogHeader` / `DialogFooter` / `DialogTitle` / `DialogDescription` / `DialogClose` | `dialog.tsx` | New, wraps `@base-ui/react/dialog`. Built and ready; not yet consumed anywhere live. |
| `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` | `table.tsx` | New. Built and ready; the app doesn't have a tabular view yet. |
| `Skeleton` | `skeleton.tsx` | New. A moving shimmer sweep (see Motion), not a generic pulse. Used in `app/dashboard/loading.tsx`. |
| `Progress` | `progress.tsx` | New, wraps `@base-ui/react/progress`. `value={null}` renders an honest indeterminate sliding bar (used in `LoadingChecklist`) rather than a fabricated percentage. |
| `Spinner` | `spinner.tsx` | New. A sized `Loader2` wrapper. |
| `EmptyState` | `shared/EmptyState.tsx` | New. Consolidates the icon + title + description + action pattern that used to be duplicated three times. |
| `Logo` | `shared/Logo.tsx` | Pre-existing (Milestone 2.1). |
| `ThemeToggle` | `shared/ThemeToggle.tsx` | Pre-existing (Milestone 2.1). |
| `IconBadge` / `SectionHeader` / `AnalyzeButtonLabel` / `LoadingChecklist` | `shared/*.tsx` | Pre-existing (Sprint 3). `LoadingChecklist` gained a `Progress` bar this milestone. |

Some primitives (`Dialog`, `Table`) aren't consumed anywhere in the live
app yet — built for the same reason `RisksCard`/`FinancialCard`/etc. were
kept in earlier sprints: real, complete, ready components rather than
speculative half-implementations, adopted when a real feature needs them.

---

## Motion

Every animation in the system is deliberately subtle (150–300ms, easing,
no bounce/overshoot):

- **Sidebar collapse** — `framer-motion` width animation (76px ↔ 240px),
  200ms.
- **Mobile drawer** — `AnimatePresence` + slide-in-from-left + backdrop
  fade, 150–200ms (upgraded this milestone from an un-animated
  conditional mount).
- **Card hover** — `-translate-y-1` + shadow increase, 200–300ms, on every
  stat/metric/project/activity card.
- **Button press** — inherited from the `Button` primitive's own
  `active:translate-y-px`.
- **Menu / Tooltip / Dialog transitions** — scale + opacity fade via Base
  UI's `data-[starting-style]`/`data-[ending-style]` attributes, 150–200ms.
- **Skeleton shimmer** — a sliding highlight band (`shimmer-sweep`
  keyframe in `globals.css`), not a generic `animate-pulse`.
- **Indeterminate progress** — a sliding segment (`progress-indeterminate`
  keyframe), honest about not having a real percentage to show.

### Reduced motion

Two layers, because they cover different animation mechanisms:

1. A global `@media (prefers-reduced-motion: reduce)` rule in
   `globals.css` collapses all plain CSS transitions/animations
   (hover states, shimmer, indeterminate progress) to near-instant.
2. `AppShell` wraps the dashboard shell in framer-motion's
   `<MotionConfig reducedMotion="user">`, since framer-motion's
   JS-driven `animate` prop (the sidebar width animation, the mobile
   drawer) ignores plain CSS overrides entirely — this was a real gap
   caught while verifying the CSS rule actually covered everything, not
   just theory.

---

## Accessibility

- **Focus rings** on every interactive element that didn't already have
  one: sidebar nav items, the collapse toggle, the mobile hamburger,
  notifications trigger, profile menu trigger — all `focus-visible:ring-2
  focus-visible:ring-ring` (or the sidebar-specific ring token inside the
  sidebar).
- **ARIA** — `aria-label` on every icon-only control; `aria-current="page"`
  on the active nav item; `role="alert"` on `Alert`; native `<label>`
  semantics via the `Label` typography component.
- **Keyboard navigation** — `Menu`/`Dialog`/`Tooltip` are Base UI
  primitives, which provide focus trapping, arrow-key navigation, and
  Escape-to-close out of the box, rather than a hand-rolled dropdown that
  would need to reproduce all of that correctly.
- **Collapsed sidebar labels** — visually hidden (`sr-only`) but present
  in the accessibility tree, and now surfaced via a real `Tooltip` on
  hover/focus (upgraded this milestone from a native `title` attribute).
- **Disabled states** — consistent `disabled:opacity-50` +
  `disabled:pointer-events-none`/`disabled:cursor-not-allowed` across
  `Button`, `Input`, `Textarea`.
- **Contrast** — every new success/warning/info token was chosen with a
  paired `-foreground` color that maintains readable contrast in both
  themes.
- **Reduced motion** — see Motion section above.

---

## Folder Structure

```
app/globals.css                 design tokens (colors, base layer,
                                  shimmer/progress keyframes, reduced-motion rule)
components/ui/                  shadcn-style primitives (this milestone added:
                                  input, textarea, card, badge, status-pill,
                                  alert, tooltip, dialog, table, skeleton,
                                  progress, typography)
components/shared/               cross-cutting composites (this milestone added:
                                  EmptyState; LoadingChecklist gained a
                                  Progress bar)
components/dashboard/shell/       the dashboard shell (Sidebar, Header, menus) —
                                    restyled onto the new tokens/primitives
components/dashboard/home/        Dashboard Home widgets — restyled
components/dashboard/*.tsx         AIWorkspace, AIMetrics, AtlasVerdict —
                                    restyled (Step 7)
app/projects/page.tsx              restyled (Step 8)
app/dashboard/loading.tsx           new — Skeleton-based loading state
```

---

## Usage Guidelines

- **Reach for a token before a raw color.** If you're about to type
  `text-gray-500`, it's almost always `text-muted-foreground`. If you're
  about to type `bg-blue-600`, it's `bg-primary`.
- **Reach for a primitive before hand-rolled markup.** A new card is
  `<Card>`, not a `<div>` with `rounded-3xl border bg-card shadow-sm`
  retyped. A new empty state is `<EmptyState>`, not a fourth hand-rolled
  copy.
- **A hero CTA can override `Button`'s default sizing.** The compact
  `size="lg"` scale is right for ordinary UI density; a page's single
  primary action (see `DashboardWelcome`, `AIWorkspace`'s analyze button)
  may override padding via `className` for extra prominence — this is a
  deliberate, documented exception, not a loophole to reach for casually.
- **`render`-substituting `Button`/`Menu`/`Dialog` triggers with a
  `Link`** works out of the box for `Button` (auto-detects and sets
  `nativeButton={false}`). For any *other* Base UI trigger that extends
  `NativeButtonProps` (check its `.d.ts` if unsure), pass
  `nativeButton={false}` explicitly when substituting a non-button
  element.
- **New semantic colors need a `-foreground` pair and both themes.**
  Don't add a bare `--new-color` without also deciding what text sits on
  top of it in light and dark mode.

---

## Future Extensions

- **Wrap the remaining routes in the shell** (`/projects`, `/research`,
  `/competitors`, `/reports`, `/templates`, `/settings`) so the design
  system's shell surrounds the whole app, not just `/dashboard` and
  `/dashboard/analysis` — tracked in `DASHBOARD.md`.
- **Adopt `Table`** once a real tabular view exists (e.g. a denser
  Projects list, or a future admin view).
- **Adopt `Dialog`** for the first real confirmation/detail modal (e.g.
  deleting a project, once that action exists).
- **Extend `StatusPill`** to the AI Workspace's verdict display
  (`AtlasVerdict`) once its content is wired to the real analysis verdict
  instead of the current hardcoded "Recommended" (a data-wiring change,
  out of scope for this visual-only milestone — see `ARCHITECTURE.md`).
- **Retrofit the orphaned `Workspace`/`Tabs` component tree and the
  landing page** onto this system once/if they're wired into a live
  route — deliberately left untouched this milestone since they weren't
  named as a polish target and touching them risked scope creep into
  components already flagged as "kept for later" in earlier sprints.
- **A real notification/activity data model** would let `Badge`/
  `StatusPill` show live counts instead of `NotificationsMenu`'s current
  honest empty state.

---

## What Was Not Touched

Per this milestone's explicit constraints — verified via `git diff`
scope, not just intention:

- `lib/analysis/` (the AI pipeline), `lib/services/`, `app/api/`,
  `lib/store/`, `lib/schemas/`, `lib/supabase.ts` — zero changes.
- Every route's URL structure — unchanged. `app/dashboard/loading.tsx` is
  a Next.js convention file (automatic loading UI for an existing
  segment), not a new route.
- The orphaned `components/workspace/` tree (`IdeaInput`, `ScoreCard`,
  `Tabs`, `ProblemCard`, etc.) and the landing page
  (`components/landing/`) — untouched, not named as a polish target.
- `AIWorkspace`'s and the Projects page's actual data/behavior — only
  their markup and class names changed; every `useAnalyzeStartup` call,
  every `listProjects()` call, every conditional render gate is identical
  to before this milestone.
