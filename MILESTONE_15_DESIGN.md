# Atlas AI — Milestone 15 Design Specification

**Dashboard UX: Making the Analysis Experience Feel Like a Product**

Status: **Design only. No code, no folders, no source files exist yet.**
This document is the complete design specification for Milestone 15,
written for review before any implementation begins.

Milestones 4–14 are complete and frozen. This milestone touches only the
application/presentation layer already introduced in Milestone 14
(`components/workspace/session/`, `components/workspace/decision-report/`,
`components/dashboard/AIWorkspace.tsx`) plus one new route-level file
(`app/dashboard/analysis/loading.tsx`). It introduces zero new dependencies,
zero new `lib/` platform code, and zero new `components/ui/` primitives.

---

## Pre-Design Verification

Every claim below is grounded in a direct read of the current codebase,
not memory. What was actually inspected:

**Backend/application layer (Milestone 14, frozen):**
`components/dashboard/AIWorkspace.tsx`, `components/workspace/session/SessionProgressExperience.tsx`,
`components/workspace/decision-report/{DecisionReport,DecisionSummaryPanel,TrustPanel}.tsx`,
`hooks/useAnalysisSession.ts`, `lib/store/sessionStore.ts`,
`lib/schemas/analysisSessionView.ts`, `lib/services/analysisSessions.ts`,
`lib/analysis-session/schemas/timeline.schema.ts`,
`lib/analysis-session/timeline/buildTimeline.ts`,
`lib/pipeline/schemas/progress.schema.ts`.

**Dashboard routes/navigation:** `app/dashboard/layout.tsx`,
`app/dashboard/page.tsx`, `app/dashboard/analysis/page.tsx`,
`app/dashboard/loading.tsx`, `components/dashboard/shell/{AppShell,Sidebar,Header}.tsx`,
`components/dashboard/home/{DashboardHome,DashboardStats,DashboardWelcome,RecentActivityPanel,RecentProjectsPanel}.tsx`.

**Existing design documentation:** `DASHBOARD.md` (the dashboard shell,
introduced pre-Milestone-4, still authoritative and live), `DESIGN_SYSTEM.md`
(the token/component-library reference, also still authoritative and live).
**Both were fully read, not skimmed** — they turned out to already answer
most of what a naive design would have re-invented.

**Styling system:** `app/globals.css` (color tokens, radius scale,
keyframes), `lib/utils.ts` (`cn()`), `lib/format.ts`
(`formatScore`/`formatPercent`/`formatRelativeTime` — already exist,
unused by Milestone 14's own components).

**Component library, checked file-by-file for what exists and what's
already adopted vs. built-but-unused:** every file in `components/ui/`
(`button`, `avatar`, `menu`, `input`, `textarea`, `card`, `badge`,
`status-pill`, `alert`, `tooltip`, `dialog`, `table`, `skeleton`,
`progress`, `spinner`, `typography`) and `components/shared/`
(`IconBadge`, `SectionHeader`, `AnalyzeButtonLabel`, `LoadingChecklist`,
`EmptyState`, `Logo`, `ThemeToggle`).

**`package.json`, verified directly, not assumed:**

```
dependencies: @base-ui/react, @supabase/supabase-js, ai, class-variance-authority,
  clsx, framer-motion, lucide-react, next, openai, react, react-countup,
  react-dom, react-icons, react-markdown, recharts, remark-gfm, shadcn,
  tailwind-merge, tw-animate-css, zod, zustand
devDependencies: @tailwindcss/postcss, @types/node, @types/react,
  @types/react-dom, eslint, eslint-config-next, tailwindcss, typescript
```

Concretely, grep-verified (not assumed) before proposing anything:

- **`recharts`** — installed, but used **only** by the orphaned
  `components/workspace/MarketChart.tsx` and the now-deprecated
  `components/workspace/report/ScoreGauge.tsx` (Milestone 14's Cutover
  Strategy already stopped rendering that file). **Not used anywhere in
  the live app today.**
- **`react-countup`** — installed, used only by the orphaned/superseded
  `components/dashboard/AIMetrics.tsx`. **Not used anywhere live.**
- **`components/ui/status-pill.tsx` (`StatusPill`)** — built (per
  `DESIGN_SYSTEM.md`, "for live/verdict-style state"), **zero usages
  anywhere in the codebase.** `DESIGN_SYSTEM.md`'s own Future Extensions
  section explicitly names extending it "to the AI Workspace's verdict
  display... once wired to the real analysis" — Milestone 14 is exactly
  that wiring. This is the single most load-bearing finding for this
  design.
- **`components/ui/table.tsx` (`Table`)** — built, **zero usages
  anywhere.** `DESIGN_SYSTEM.md`: "adopted when a real feature needs it."
- **`components/ui/dialog.tsx`** — built, zero usages anywhere. No
  confirmation/detail-modal need exists in this milestone's scope; not
  proposed here either.
- **No `components/ui/tabs.tsx` exists.** Confirmed by directory listing.
  This directly rules out a tabbed report layout as an option without
  first building new UI infrastructure — see Complexity Review.
- **`framer-motion`** — already live, used by `AppShell`/`Sidebar` for
  the sidebar-collapse and mobile-drawer animations, wrapped in
  `<MotionConfig reducedMotion="user">`. Any new motion this milestone
  adds must follow that exact same convention (see Design Principles).
- **`components/shared/LoadingChecklist.tsx`** — an older, pre-Milestone-14
  pattern (indeterminate-only `Progress value={null}`, honest about
  having no real per-step percentage). Superseded in spirit by
  `SessionProgressExperience`, which already uses a real, determinate
  percentage. Not reused here — it would be a step backward in honesty.

---

## 1. Purpose

Milestone 14 wired the real backend into the live application; Milestone
15 exists to make that wiring *look and feel* like a product a founder
would trust and pay for, not a working-but-plain internal tool. This is
the first milestone in the approved roadmap's "product-experience phase"
— everything it builds sits entirely on top of Milestone 14's already-real
data (`AnalysisSessionView`), and on top of `DASHBOARD.md`/`DESIGN_SYSTEM.md`'s
already-real, already-live design system. No new intelligence, no new
data, no new backend call.

## 2. Product Vision

> The backend already thinks like an investment committee. The dashboard
> should look like one.

Every real signal Atlas AI already computes — live stage progress, a
timeline of what happened, sourced evidence, a four-dimension confidence
breakdown — currently renders as functional-but-plain stacked cards
(Milestone 14's own honest description of its scope: wiring, not
polish). This milestone closes that gap using components the design
system already built and is waiting to have adopted (`StatusPill`,
`Table`), not by inventing a new visual language.

## 3. UX Goals

1. A user can tell, within one glance, what state an analysis is in —
   without reading a sentence of body text.
2. A user can tell, within one glance, how much of the result to trust —
   confidence and evidence are never buried below the content they
   support.
3. Every one of the 8 dashboard states (Section 10) has a distinct,
   correct visual treatment — no state ever looks like another.
4. Nothing on the page exists purely to look finished — every element
   answers a real question a skeptical founder would ask (Section 18).
5. The experience matches `DASHBOARD.md`/`DESIGN_SYSTEM.md`'s existing
   bar exactly — no new visual language, no new token, no new primitive
   unless a real gap is found (none was, this milestone).

## 4. Design Principles

Inherited, verbatim, from `DESIGN_SYSTEM.md` — this milestone adds no new
principles, it applies the existing ones to a surface they hadn't reached
yet:

1. **One token, one meaning** — `bg-primary`/`text-success`/etc., never a
   raw Tailwind color, for anything semantic.
2. **Primitives, not patches** — reach for `StatusPill`/`Table`/`Badge`/
   `Card` before hand-rolling equivalent markup.
3. **Subtle, not flashy** — any new motion is 150–300ms, wrapped in the
   same `MotionConfig reducedMotion="user"` convention `AppShell` already
   established; if a reviewer notices the animation before the content,
   it's wrong.
4. **Honest data, always** — a `StatusPill` never claims a state that
   isn't real; a confidence number is never rounded into implying more
   precision than the four-dimension breakdown actually has.
5. **Visual work is not architecture work** — this milestone touches zero
   business logic, services, stores' shapes, schemas, or routes' request/
   response contracts. Every change is presentation.

## 5. Information Architecture

The real question hierarchy a founder has, in the order they'd ask it,
which this milestone's layout is built to answer top-to-bottom:

```
"What's happening right now?"        → state + progress (top of page, always visible first)
"What already happened?"              → timeline (immediately below progress)
"Can I trust what I'm about to read?" → Trust panel (leads the completed view)
"What did Atlas AI conclude?"         → Decision summary panel (follows Trust)
"What should I do next?"              → Cancel/Retry (while active) or nothing
                                          new (Startup Builder, a later milestone,
                                          owns "next steps")
```

This is a deliberate reordering from Milestone 14's own layout (which
put the Decision summary before Trust). See Section 11 for the
reasoning.

## 6. Dashboard Layout

No change to the shell (`AppShell`/`Sidebar`/`Header`) or to Dashboard
Home (`/dashboard`) — both are already real, already token-based, already
live per `DASHBOARD.md`/`DESIGN_SYSTEM.md`, and neither was named as a
polish target for this milestone. The only page whose layout changes is
`/dashboard/analysis`:

```
AppShell (unchanged)
  main
    AIWorkspace                                    (unchanged composition role)
      IdeaCommandCenter card                       (unchanged)
      [state-dependent content — see Section 10]
        SessionProgressExperience                   (redesigned)
          StatusPill + stage stepper + timeline
        DecisionReport                               (reordered)
          TrustPanel                                  (leads)
          DecisionSummaryPanel                         (follows)
      ReportHistoryPanel aside                       (unchanged)
```

## 7. Navigation

Unchanged. The sidebar's "AI Analysis" item already points to
`/dashboard/analysis` (`DASHBOARD.md`'s own nav table); no new nav item,
no renamed label, no new route. A live-session indicator elsewhere in the
shell (e.g. the Header) was considered and explicitly rejected — see
Complexity Review.

## 8. User Journey

**Before Milestone 15:** a user watching an active analysis sees a Card
with a spinner icon, a plain sentence ("Analyzing the market (2 of 6) —
about 4s remaining"), a bare `Progress` bar, Cancel/Retry buttons, and a
flat bulleted list of timeline events — all in one visual weight, nothing
emphasized. On completion, they see two large, densely-packed Cards
(Decision summary, then Trust) stacked in a long vertical scroll, with no
visual signal for *how much to trust* what they're reading until they've
already scrolled past the conclusions.

**After Milestone 15:** the same user sees a `StatusPill` naming the
exact state at a glance ("Analyzing", pulsing), a compact 6-segment stage
stepper showing exactly which of the six stages is done/current/pending,
and the same timeline/Cancel/Retry beneath it for detail. On completion,
the Trust panel renders **first** — a `StatusPill`-led confidence summary
and a real `Table` of sources — immediately followed by the Decision
summary, so credibility is established before conclusions are read, not
after.

**Exactly what changes:** visual hierarchy and information order. No new
data, no new interaction the backend didn't already support in Milestone
14 (Cancel/Retry/poll are unchanged).

## 9. Component Hierarchy

```
components/workspace/session/
  SessionProgressExperience.tsx      MODIFIED — adds a StatusPill and an
                                       inline stage-stepper section (not a
                                       separate file — see Complexity
                                       Review); keeps the existing
                                       timeline list and Cancel/Retry
                                       buttons, restyled to the spacing/
                                       radius rules in Section 11. The
                                       timeline list gains a native
                                       <details>/<summary> disclosure,
                                       collapsed by default, but ONLY once
                                       the session reaches a terminal
                                       state (Progressive Disclosure) —
                                       zero new JS state, zero new
                                       dependency.

components/workspace/decision-report/
  DecisionReport.tsx                 MODIFIED — renders TrustPanel before
                                       DecisionSummaryPanel (Section 5/11).
  DecisionSummaryPanel.tsx           MODIFIED — visual polish only:
                                       StatusPill/Badge consistency,
                                       spacing rhythm, no structural change
                                       to what data it reads.
  TrustPanel.tsx                     MODIFIED — sources list becomes a
                                       real Table (Title | Domain |
                                       Confidence | Retrieved); confidence
                                       stats reuse formatPercent from
                                       lib/format.ts instead of inline
                                       string interpolation; a StatusPill
                                       summarizes overall trust tier next
                                       to the heading.

app/dashboard/analysis/
  loading.tsx                        NEW — a skeleton matching this
                                       milestone's redesigned layout,
                                       following the exact pattern
                                       app/dashboard/loading.tsx already
                                       established.

components/dashboard/AIWorkspace.tsx MODIFIED — only if the state→component
                                       gating logic needs updating for the
                                       "Waiting" grouping (Section 10);
                                       otherwise unchanged from Milestone 14.
```

No new file under `components/ui/`. No new file under `lib/`. No new
Zustand store, no new hook, no new schema, no new service, no new route.

## 10. Dashboard States

All eight states, each mapped to `AnalysisSessionView`'s real fields —
nothing here is inferred from anything other than `view`/`view.session.state`:

| Dashboard state | `session.state` | Visual treatment |
|---|---|---|
| **Empty** | *(no session — `view === null`)* | `EmptyState` (unchanged from Milestone 14) — "No analysis yet." |
| **Starting** | `starting` | `StatusPill tone="primary" pulse` "Starting", stepper at 0/6, Cancel available. |
| **Running** | `analyzing` | `StatusPill tone="primary" pulse` "Analyzing", stepper shows the real current stage, real percent, Cancel available. |
| **Waiting** | `waiting_retry` **or** `cancelling` | `StatusPill tone="warning" pulse` — "Retrying" or "Cancelling" (label taken from the same state, tone shared because both mean "the system is transitioning, no user action needed right now"). Cancel available only for `waiting_retry` (matches Milestone 14's existing `CANCELLABLE_STATES`, unchanged). |
| **Needs Attention** | `needs_attention` | `StatusPill tone="warning"` (no pulse — this one *does* need user action) "Needs attention", stepper shows the failed stage, Retry button emphasized (primary variant, not outline). |
| **Completed** | `completed` | `StatusPill tone="success"` "Complete" leading the Trust panel; `DecisionReport` renders (Trust, then Decision summary). |
| **Failed** | `failed` | `StatusPill tone="destructive"` "Failed", the failure's real timeline label shown as the explanation (never a generic "something went wrong" when a real message exists). |
| **Cancelled** | `cancelled` | `StatusPill tone="neutral"` "Cancelled". |

Grouping `waiting_retry`/`cancelling` under one "Waiting" UI label (rather
than the eight `SessionState` values getting eight visually distinct
treatments) is a deliberate simplification: both states share the exact
same user-facing meaning ("hold on, no action needed"), and giving them
identical tone/behavior avoids a ninth visual permutation for a
distinction the user doesn't need to perceive. `needs_attention` stays
separate because it's the one state that *does* require the user to act.

## 11. Visual Hierarchy

- **Trust leads Decision, always, once completed.** Reordering from
  Milestone 14 (Section 5's reasoning): a product built on Atlas AI's own
  "never invent statistics, challenge weak assumptions" system prompt
  should show *why to believe* something before showing *what it
  concluded* — this is the same posture the product takes toward a
  founder's idea, turned onto its own output.
- **State is always the first thing on the page** while a session is
  active — a `StatusPill` above the stepper, never buried after a
  paragraph of text (Milestone 14 put a state-derived sentence first;
  this milestone makes the state itself, not a sentence about it, the
  literal first visual element).
- **One primary accent per view.** The active Cancel/Retry action uses
  `Button`'s primary treatment only when it's the single recommended next
  step (Retry during `needs_attention`); Cancel stays `variant="outline"`
  always, since it's never the recommended action, only an available one.
- **Radius/spacing/motion rules are inherited exactly from
  `DESIGN_SYSTEM.md`** — `rounded-3xl` for the outer Cards, `rounded-2xl`
  for nested blocks (the Table, the stepper's segment track), `p-6`/`p-7`
  card padding, `gap-6` between sibling cards, 150ms for the stepper
  segment fill transition (a hover/press-tier micro-interaction, not a
  layout-affecting one).

## 12. Responsive Behaviour

Inherited from the shell's existing mobile-first rules
(`DASHBOARD.md`/`CLAUDE.md`) — this milestone adds no new breakpoint
logic:

- **Mobile (`<md`):** the stage stepper's 6 segments stay in one row
  (each segment is a thin bar, not a labeled circle, so 6 fit at any
  width down to 320px without wrapping) — labels for the current stage
  only appear as text beneath the stepper, not per-segment. The Table in
  `TrustPanel` scrolls horizontally within its own container (`Table`'s
  own `overflow-x-auto` wrapper already handles this — no new CSS
  needed).
- **Tablet/Desktop (`md`+):** unchanged two-column `AIWorkspace` grid
  (`xl:grid-cols-[1fr_320px]`, already established), Trust/Decision
  panels stack vertically within the main column at every width — no
  side-by-side panel layout is introduced (a 2-column report layout was
  considered and rejected; see Complexity Review).

## 13. Accessibility

Extending `DASHBOARD.md`/`DESIGN_SYSTEM.md`'s existing, already-verified
patterns to the new elements, not inventing a new a11y approach:

- The stage stepper is a `<ol>` (ordered — stage order is meaningful),
  each stage an `<li>` with `aria-current="step"` on the current one
  (mirroring `SidebarNavItem`'s existing `aria-current="page"` pattern
  for the active nav item) and a real text label in the DOM (not
  icon-only) for the current stage — the other five stay compact but
  keep an `sr-only` label each, matching the collapsed-sidebar pattern
  already established.
- `StatusPill`'s dot is already `aria-hidden="true"` in its existing
  implementation (verified) — the visible `label` text is what a screen
  reader announces, so no state is ever conveyed by color/pulse alone.
- The new `Table` in `TrustPanel` uses real `<th>`/`scope` semantics via
  the existing `TableHead` component — no change needed there, it's
  already correct.
- Retry's emphasis (primary vs. outline) is conveyed by more than color —
  the button's own text already says "Retry"; no meaning is added by
  color alone.
- Every existing focus-ring/`aria-label` convention from Milestone 14's
  Cancel/Retry buttons is unchanged.

## 14. Performance Strategy

- **Rendering strategy.** No change from Milestone 14: `AIWorkspace` and
  everything beneath it (`"use client"`) renders on the client;
  `app/dashboard/analysis/page.tsx` stays a Server Component fetching
  `listProjects()` for the history panel, unchanged. The new
  `loading.tsx` is a plain Server Component skeleton, matching
  `app/dashboard/loading.tsx`'s existing pattern exactly.
- **Polling strategy.** Unchanged — the same `useAnalysisSession` hook,
  the same ~1.75s fixed interval, the same single timer per active
  `AIWorkspace` instance. This milestone reads the same store fields it
  already reads; it does not add a second poller anywhere (see
  Complexity Review's rejected Header-indicator idea for exactly why that
  would have required one).
- **Memoization opportunities.** None warranted. The stepper derives
  "which of 6 stages is current" from `session.timeline`'s last entry —
  an O(6) lookup against a 6-element constant array, recomputed on every
  poll response regardless (the data itself changes every poll, so
  memoizing the derivation would save nothing). Per `CLAUDE.md`'s own
  "memoize with a reason, not by default" rule, no `useMemo`/`useCallback`
  is added anywhere in this milestone that wasn't already in Milestone
  14's hook.
- **Expensive recomputations.** None identified. Every value rendered
  (`session.progress`, `session.timeline`, `verification.*`) is already
  computed server-side by Milestone 11–13's own code; this milestone only
  changes how those already-computed values are laid out and styled.
- **Loading strategy.** `app/dashboard/analysis/loading.tsx` (new) covers
  the brief window while `listProjects()` resolves for the history panel
  — the exact same convention `app/dashboard/loading.tsx` already uses
  for Dashboard Home, applied to the one route that was missing it.

### Render Responsibility Matrix

| Component | Owner | Render trigger | Recomputation trigger |
|---|---|---|---|
| `AIWorkspace` | `sessionStore` (via `useAnalysisSession`'s selectors) + local `idea` `useState` | Any selected store field (`view`/`status`/`error`) changes, or `idea` changes | None — pure composition/gating, no derived value of its own |
| `IdeaCommandCenter` | Local `idea` state, owned by and passed down from `AIWorkspace` | `idea` or `loading` prop changes | None |
| `SessionProgressExperience` | Props only (`session`, read from the store by `AIWorkspace`) | Every poll response that produces a new `session` object (~1.75s cadence while active) | The stepper's "current stage" and the `StatusPill` tone/label are both derived fresh from `session.timeline`/`session.state` on every render — O(6), not memoized (Performance Strategy above) |
| `TrustPanel` | Props only (`verification`, non-null exactly once — at completion) | Mounts once, when `AIWorkspace`'s gating switches to the completed branch; does not re-render on any further poll (polling stops at a terminal state) | None — direct pass-through render |
| `DecisionSummaryPanel` | Props only (`profile`, set once at completion) | Same as `TrustPanel` — mounts once | None |
| `DecisionReport` | Props only (`profile`, `verification`) | Mounts once, composes the two panels above | None |
| `ReportHistoryPanel` | Server-rendered props (`projects`, fetched once by `app/dashboard/analysis/page.tsx`) | Only a full page navigation/reload — never reacts to client-side session polling | None — static for the page's lifetime |

The key property this matrix makes explicit: **only `SessionProgressExperience`
re-renders on the poll cadence.** `TrustPanel`/`DecisionSummaryPanel`/`DecisionReport`
mount exactly once per completed session and never again until a new
`start()` call replaces the whole tree — polling never touches them after
that first mount, since `AIWorkspace`'s gating logic (Section 6) unmounts
`SessionProgressExperience` entirely once `session.state === "completed"`.

## 15. Relationship to Milestone 14

**What remains unchanged:** the entire data flow (`useAnalysisSession` →
`/api/analysis-sessions/*` → `lib/services/analysisSessions.ts` →
`lib/analysis-session`/`lib/verification`), the Zustand store's shape,
the `AnalysisSessionView`/`VerificationSummary`/`AnalysisSession` schemas,
the Cancel/Retry request lifecycle, the polling interval, `IdeaCommandCenter`,
`ReportHistoryPanel`, and every route file under `app/api/analysis-sessions/`.

**What is extended:** `SessionProgressExperience`'s internal markup (adds
a `StatusPill` and a stage stepper, keeps its existing props signature
`{ session, onCancel, onRetry }` unchanged), `DecisionSummaryPanel`'s and
`TrustPanel`'s internal markup (same `{ profile }`/`{ verification }`
props, unchanged), `DecisionReport`'s internal render order.

**What is reused:** every prop, every derived value, every state check
Milestone 14 already computed (`isTerminalSessionState`, the `CANCELLABLE_STATES`
set, `formatProgress`). No new derivation is introduced — this milestone
is presentation-only, exactly as Milestone 14's own design was for
Milestones 11–13's data.

## 16. UI Mapping

| Backend capability | Exact UI component (Milestone 15) |
|---|---|
| **Pipeline** | The stage stepper inside `SessionProgressExperience` (indirectly, via Session's own projection — Pipeline itself is never rendered directly, unchanged from Milestone 14's boundary rule). |
| **Analysis Session** | `StatusPill` + stepper inside `SessionProgressExperience`; `AIWorkspace`'s overall state-gated composition. |
| **Verification** | `TrustPanel`, now leading `DecisionReport`. |
| **Decision** | `DecisionSummaryPanel`, now following `TrustPanel`. |
| **Timeline** | The existing timeline list inside `SessionProgressExperience`, kept below the new stepper (stepper = "where are we now," timeline = "what already happened," both real, both kept — see Complexity Review). |
| **Progress** | The stepper's segment fill + the existing `Progress` percentage, both inside `SessionProgressExperience`. |
| **Evidence** | `TrustPanel`'s per-claim evidence list, now paired with the new sources `Table`. |
| **Confidence** | `TrustPanel`'s four-dimension stats, now labeled with a summarizing `StatusPill` next to the section heading. |

## 17. Product Impact

**User-visible value.** The exact same real data Milestone 14 surfaced
now reads at a glance instead of requiring a full read of body text — a
`StatusPill` communicates state in under a second; a stepper communicates
"how far along" without reading a sentence; a Table makes sources
scannable instead of a bullet list.

**Business value.** `DESIGN_SYSTEM.md`'s own stated problem — real
components built and sitting unused (`StatusPill`, `Table`) — gets
resolved by the exact feature that most needed them. This is a
low-risk, high-completion-value milestone: it finishes work that was
already paid for (the design system) rather than starting new work.

**Which `PRODUCT_BACKLOG.md` items improve further:** none newly solved
(Milestone 14 already closed Analysis Experience and Trust & Evidence) —
this milestone makes those same solved items *more legible*, which
`PRODUCT_BACKLOG.md`'s own Priority 2 "Dashboard UX" section names
directly ("better visual analytics," "more interactive dashboard").

## 18. User Questions Answered

| Question | Answered by |
|---|---|
| "What's happening right now, at a glance?" | The `StatusPill`. |
| "How far along is this?" | The stepper + percent. |
| "Should I believe what I'm about to read?" | `TrustPanel`, now shown first. |
| "Which sources back this?" | The sources `Table`. |
| "What does this state mean — do I need to do anything?" | The Needs-Attention/Waiting distinction (Section 10) — a `StatusPill` tone difference maps directly to "action needed" vs. "just wait." |

## 19. Success Metrics

- Every one of the 8 states in Section 10 renders a visually distinct,
  correct treatment — verified by a scratch page rendering all 8 fixture
  states side by side (same technique Milestone 14's own verification
  used).
- `StatusPill` and `Table` are adopted at least once each — resolving
  `DESIGN_SYSTEM.md`'s own "built, not yet consumed" note for both.
- Zero new dependencies added (`package.json` diff is empty).
- Zero new files under `lib/` (`git status` confirms — this is a
  presentation-only milestone).
- The redesigned Trust-first ordering is verified against a real
  completed session (not only a fixture), matching Milestone 14's own
  "verify against something real" discipline.

## 20. Risks

- **Reordering Trust before Decision is a visible behavior change**, not
  a pure restyle — flagged explicitly rather than bundled silently into
  "just polish," per `CLAUDE.md`'s "never mix a refactor and a redesign
  without saying so" spirit. The reasoning (Section 5/11) is real, not
  decorative, but it's still a decision worth the reviewer's explicit
  attention.
- **Still-thin data, unchanged from Milestone 14.** With no search-
  provider credentials configured, the sources `Table` and confidence
  stats will often render honestly empty/low — exactly as Milestone
  14's own Risks section already documented and accepted. This
  milestone doesn't change that; it only changes how the same thin data
  is presented (a `Table` with zero rows is still an honest, correct
  render — `TrustPanel`'s existing "No sources are attached..." empty
  copy is kept for that case).
- **The stepper introduces a second visual encoding of progress**
  (segments) alongside the existing `Progress` bar (percentage) and the
  timeline (a list). Three representations of the same underlying
  `session.progress`/`session.timeline` risk feeling redundant if not
  clearly differentiated — mitigated by giving each a distinct job
  (stepper = which stage, bar = how far in that stage's overall journey,
  timeline = historical detail), documented in Section 16, not left
  implicit.

## 21. Non-Goals

- Does not add new intelligence, new backend calls, new schema fields, or
  new derived data of any kind.
- Does not modify `AppShell`, `Sidebar`, `Header`, or Dashboard Home
  (`/dashboard`) — all already real and out of this milestone's scope.
- Does not add a live "session in progress" indicator anywhere outside
  `/dashboard/analysis` (a Header badge was considered and explicitly
  rejected — see Complexity Review) — session awareness is scoped to the
  page that owns the active polling loop.
- Does not make polling survive navigation away from `/dashboard/analysis`
  — the hook's timer is cleaned up on unmount, unchanged from Milestone
  14; making it page-independent would be a lifecycle-ownership change,
  not a UX-polish one.
- Does not introduce a new `components/ui/tabs.tsx` primitive or any
  other new component-library file — a tabbed report layout was
  considered and rejected specifically because it would require new UI
  infrastructure this milestone has no mandate to build (Complexity
  Review).
- Does not touch `lib/analysis-session/`, `lib/pipeline/`, `lib/decision/`,
  or `lib/verification/` in any way.
- Does not add a session history/list view, a project detail route, or
  any other feature named in `PRODUCT_BACKLOG.md`'s Priority 1 items
  (those are Milestones 16–20, per the approved roadmap).
- Does not wrap any additional routes (`/projects`, `/research`, etc.) in
  the shell — `DASHBOARD.md`'s own still-open Future Extension Point,
  explicitly not this milestone's job.
- Does not retrofit the orphaned `components/workspace/` tree
  (`IdeaInput`, `Tabs`, `ScoreCard`, ...) onto the design system —
  `DESIGN_SYSTEM.md` already named this out of scope once; still true.

## 22. Definition of Done

1. `SessionProgressExperience`, `DecisionSummaryPanel`, `TrustPanel`, and
   `DecisionReport` are modified exactly as Sections 9/10/11 specify —
   same props, same data dependencies, presentation only.
2. `app/dashboard/analysis/loading.tsx` exists, matching
   `app/dashboard/loading.tsx`'s existing skeleton convention.
3. `StatusPill` and `Table` are each adopted at least once; grep confirms
   zero new files under `components/ui/`.
4. All 8 states in Section 10 render correctly, verified via a temporary
   scratch page (deleted before the final build), the same technique
   Milestone 14 used.
5. `tsc --noEmit`, `eslint`, `next build` all clean (zero new errors
   beyond the pre-existing, unrelated `Testimonials.tsx` issue).
6. `git status --short` shows only the files named in Section 9 — no
   frozen path, no `lib/` file, no shell/Dashboard-Home file touched.
7. `package.json` is byte-identical (`git diff package.json` empty) — no
   new dependency.
8. Nothing committed until explicitly requested.

---

## UX Principles

The core philosophy every layout/state decision in this document answers
to — not a restatement of Section 4's visual tokens, but the interaction
philosophy behind them:

1. **State before content.** A user should never have to read prose to
   find out what's happening — the state itself (`StatusPill`) is always
   the first thing rendered, never a sentence describing the state.
2. **Trust before conclusions.** Atlas AI's own system prompt refuses to
   let a founder's idea go unchallenged; this dashboard applies the same
   standard to its own output — evidence and confidence are read before
   findings, never after (Section 5/11).
3. **No dead ends.** Every state gives the user something to do next
   (Cancel, Retry, read the result) or clearly communicates that nothing
   is needed (`Waiting`) — a screen that just sits there with no signal
   of what happens next is never acceptable.
4. **Consistency over novelty.** A `StatusPill` means the same thing
   everywhere it appears; a `Card` is always `rounded-3xl`. A user who
   has seen one state of this dashboard can predict the shape of every
   other state without re-learning it.
5. **Calm, not urgent, unless it's real.** Warning/destructive tones are
   reserved for states that actually need attention (`needs_attention`,
   `failed`) — a system that's merely waiting (`Waiting`) never borrows
   alarming color to look busy.
6. **Density is not clutter.** Showing real evidence, real sources, and a
   real four-dimension confidence breakdown is dense — that density is
   the product's value, not something to hide. What's avoided is
   *decorative* density (motion, gradients, redundant copy), never
   *informational* density.

## Scan Order

The intended visual reading path, top to bottom, and why each element
earns its position — this is the concrete, eye-level version of Section
5's question hierarchy:

1. **`StatusPill`** — the very first thing the eye should land on. One
   glance answers "what's happening" before anything else is read.
2. **Stage stepper** (active states only) — immediately below, answering
   "how far along" without requiring the first fixation to move far.
3. **Progress bar / Cancel-Retry actions** — same visual band as the
   stepper, since they're all "current status" information a user
   processes together.
4. **Timeline** (collapsed once terminal — see Progressive Disclosure) —
   below the fold of "current status," since it's detail, not headline.
5. **On completion: `TrustPanel`** — confidence stats first, then
   sources, then verified claims, then unverified statements — in that
   order because a founder's real question sequence is "how confident,"
   "from where," "what's actually backed up," "what isn't."
6. **`DecisionSummaryPanel`** — read last, because by this point the
   reader already knows how much to trust what they're about to read.
7. **`ReportHistoryPanel`** (aside, not in the main scan path) —
   deliberately off to the side at desktop widths and below everything
   else on mobile, since it's a secondary "look at past work" surface,
   never the primary scan target.

This order is the same for every state that reaches it — the scan path
never reshuffles between a `completed` and a `failed` session, for
example; only the content within each already-fixed position changes.

## Progressive Disclosure

| Category | What it covers | Why |
|---|---|---|
| **Always visible** | `StatusPill`, stage stepper, `Progress` bar, Cancel/Retry actions (while relevant), `TrustPanel`'s confidence stats, verified claims, and unverified statements, `DecisionSummaryPanel`'s findings/risks/SWOT | These directly answer the core questions in Section 18 — hiding any of them behind a click would contradict "minimal without hiding important information." |
| **Expandable** | The timeline list — but **only once the session reaches a terminal state** (`completed`/`cancelled`/`failed`). Collapsed by default behind a native `<details>`/`<summary>` ("Show timeline — N events"), zero new JS state. While a session is still active, the timeline stays always-visible (it's live status, not historical detail yet). | Once a session is done, the blow-by-blow history is a debugging/detail surface, not the primary answer to any of Section 18's questions — collapsing it by default keeps the completed view scannable without deleting the information. |
| **Optional** | `ReportHistoryPanel` — present on every load, but positioned outside the main scan path (Scan Order, item 7) since it answers a different, secondary question ("what have I analyzed before") than the page's primary content. | It's real and useful, but not what a user came to this specific page state to read. |
| **Never hidden** | `TrustPanel`'s `unverifiedStatements`/`decisionLimitations`-derived content, and any real failure message (`failed`'s Timeline-sourced explanation) | This is the direct application of Atlas AI's "never invent, always disclose limitations" system-prompt posture to its own UI — bad news or an honest gap is never the thing progressive disclosure quietly de-emphasizes. |

## Empty State Philosophy

- **What the user should see:** a real icon, a specific one-line
  headline ("No analysis yet" — not "No data"), and a description that
  names the actual mechanism that fills the emptiness ("Describe a
  startup idea above and Atlas AI will generate a full investor-grade
  report here") — never a bare icon with no explanation.
- **What guidance is provided:** every empty state either carries its own
  call-to-action (`RecentProjectsPanel`/`RecentActivityPanel`'s existing
  "Analyze your first idea" button — unchanged, already correct) or sits
  directly beneath the action that fills it (`AIWorkspace`'s own empty
  state, right below `IdeaCommandCenter`'s textarea — deliberately
  carries **no** redundant button, since the actual input is already the
  first thing on the page; adding a second "Analyze" call-to-action
  directly under the one already visible would be exactly the decorative
  redundancy Section 4/UX Principle 6 rules out).
- **How empty screens avoid feeling unfinished:** by using the same
  `EmptyState` primitive everywhere (Section 4's "primitives, not
  patches") so every empty surface in the app shares one intentional
  visual treatment, and by never showing a generic placeholder — every
  empty state's copy is specific to what will actually appear there,
  which is what separates "nothing is here yet" from "this looks broken."

## Future Dashboard Growth

How Milestones 16–19 (Competitor Intelligence Depth, Market Intelligence
Depth, Financial Intelligence Depth, Reports — per the approved roadmap)
extend this dashboard **without requiring it to be redesigned**:

- **Milestones 16–18 (Competitor/Market/Financial Intelligence Depth).**
  Each deepens `DecisionProfile`'s own data — more real `keyFindings`,
  more real `criticalRisks`, more real `sources`/`evidence`. Every one of
  those fields already renders through `DecisionSummaryPanel`/`TrustPanel`
  exactly as built in this milestone — a richer `DecisionProfile` produces
  a richer render with **zero component changes**, the same "automatic
  enrichment" property `VERIFICATION.md` and `MILESTONE_14_DESIGN.md`
  already predicted for the Decision/Trust boundary. The sources `Table`
  gains rows; it doesn't need a new column or a new component to do so.
- **Milestone 19 (Reports).** Because `TrustPanel`/`DecisionSummaryPanel`
  take plain `{ profile }`/`{ verification }` props — never a live
  `AnalysisSession`, never a dependency on polling or the store — Reports
  can render the exact same two components against a stored/completed
  profile with no session in flight at all. This milestone's own
  discipline (presentation components that only know about
  already-computed data, never about how that data arrived) is what
  makes that reuse possible without a fork or a rewrite.
- **What does *not* need to grow:** the shell, Dashboard Home, the
  stepper/state vocabulary (Section 10's eight states are already
  exhaustive — no future milestone introduces a ninth `SessionState`
  without a Pipeline/Session design change first, which is out of a
  dashboard milestone's authority by definition), or the Scan Order
  (Section "Scan Order" — trust-before-conclusions remains correct
  regardless of how much richer the conclusions get).

---

## Complexity Review

**Second pass, performed after adding UX Principles/Scan Order/
Progressive Disclosure/Empty State Philosophy/Future Dashboard Growth —
re-checking specifically what this revision added, not just what the
first draft proposed:**

- **The timeline's collapse/expand behavior uses a native `<details>`/
  `<summary>` element, not a new component, not a `useState` toggle, and
  not a new dependency.** This was deliberately chosen over a hand-rolled
  accordion (which would need its own open/closed state, an icon rotation,
  and ARIA wiring `<details>` already provides natively) — the simplest
  possible implementation of a real, now-required Progressive Disclosure
  need.
- **No new component file was added by this revision.** UX Principles,
  Scan Order, Progressive Disclosure, Empty State Philosophy, and Future
  Dashboard Growth are documentation sections only — they justify and
  constrain the existing component list from the first draft, they don't
  introduce a new one. The Render Responsibility Matrix (Performance
  Strategy) is also documentation, not a new abstraction.
- **A collapse toggle for `TrustPanel`'s verified-claims list was
  considered and rejected.** Once data is real (Milestones 16–18), this
  list could grow long — but no real data exists today to size that
  problem against, and Progressive Disclosure's own "never hidden" rule
  would apply to it anyway (verified claims are core trust content, not
  detail to de-emphasize). Speculatively adding a collapse control for a
  list that's currently empty in this environment would be exactly the
  "exists only for theoretical future use" pattern this review is
  required to remove. Not added; the day real data makes this list long
  enough to warrant it, that's its own small, easy addition — not
  something to build ahead of the need.
- **A "recently viewed states" or state-history breadcrumb (beyond the
  timeline itself) was considered and rejected** for the same reason —
  the Timeline already is that history; a second, separate history
  affordance would duplicate it for no new information.

Every proposed component was checked against "does this always render
with something else, and does it exist for a real, present need?" —
not performed as a formality:

- **Stage stepper is inline inside `SessionProgressExperience`, not a
  separate file.** It never renders independently of that component and
  reads the exact same `session` prop — a separate file would be an
  import + a prop-forwarding indirection for zero reuse benefit. Merged,
  matching Milestone 14's own precedent (merging `SessionTimelinePanel`
  into the same component for the identical reason).
- **A Header "session in progress" indicator was proposed, then removed.**
  Reasoning traced through fully: it would read the shared `sessionStore`
  (safe, no duplicate poll loop — only the component that calls `start`/
  `poll` owns a timer, a read-only consumer elsewhere doesn't create a
  second one). But the moment a user navigates away from
  `/dashboard/analysis`, `AIWorkspace`'s hook instance unmounts and its
  timer is cleared (unchanged Milestone 14 behavior) — a Header badge
  would then freeze on the last-known state instead of showing something
  live, which is worse than not showing it at all: a stale badge silently
  claiming to be current is a "never fabricate" violation in spirit, even
  though every individual value it shows would technically be real.
  Making this genuinely reliable would require either page-independent
  polling ownership or session-id persistence/resumption — both real
  architectural changes, neither in scope for a UX-polish milestone.
  Removed; recorded as a Non-Goal and a Risk rather than shipped
  half-solved.
- **A tabbed report layout (Overview/Findings/Trust) was proposed, then
  removed.** `components/ui/` has no `Tabs` primitive today (confirmed by
  directory listing, not assumed) — building one would be new UI
  infrastructure, explicitly out of this milestone's mandate ("built on
  top of the existing architecture"). A single, well-ordered scroll with
  clear section headers (Section 5's information architecture) achieves
  the same "easy to scan despite density" goal using only primitives that
  already exist.
- **A confidence trend chart (`recharts`) was considered and rejected.**
  There is exactly one confidence data point per analysis today — no
  history, no refresh-over-time data exists yet to chart. A chart with
  one point is decorative, not informative; explicitly not added. `recharts`
  remains unused, unchanged from before this milestone.
- **`DecisionSummaryPanel`'s four SWOT quadrants, findings, and critical
  risks stay in one panel, not split further** — this was already the
  Milestone 13/14 merge decision (Thesis+Findings → one
  `DecisionSummaryPanel`) and nothing new argues for re-splitting it;
  re-litigating an already-justified merge would be churn, not
  simplification.

---

## Performance Review

- **Expected render flow.** `AIWorkspace` (client) → gated on `view`/`status`
  → exactly one of `EmptyState` / `SessionProgressExperience` /
  `DecisionReport` renders at a time, unchanged from Milestone 14's own
  gating logic, only the rendered content inside each branch changes.
- **Expected polling flow.** Unchanged: one `setTimeout`-chained poll per
  mounted `AIWorkspace` instance, ~1.75s cadence, cleared on unmount or
  once a terminal state is reached.
- **Expected re-render boundaries.** `useSessionStore`'s per-field
  selectors (unchanged from Milestone 14) mean a poll response only
  re-renders the components reading the fields that actually changed
  value — this milestone doesn't add a new selector or widen an existing
  one.
- **Expected state ownership.** `sessionStore` remains the single owner
  of `view`/`status`/`error`; this milestone adds no second store, no
  component-local duplicate of any field already in that store (the
  stepper's "current stage" is derived at render time from
  `session.timeline`, never stored).

---

## Observability

- **Expected runtime behavior.** Identical request/response pattern to
  Milestone 14 — this milestone changes zero network behavior. Anyone
  debugging should still look at `/api/analysis-sessions/*` in the
  Network tab exactly as before.
- **Expected user-visible behavior.** A `StatusPill` and stepper visible
  within one render of any poll response; the Trust panel visible before
  the Decision panel on every completed session, with no flash of the old
  order (this is a static render-order change, not a client-side
  reorder-after-mount).
- **Dashboard health indicators.** The same health check Milestone 14
  established still applies unchanged: `POST /api/analysis-sessions`
  with a real idea, confirm `session.state` and `verification` populate.
  Additionally for this milestone: confirm the `StatusPill`'s `tone`
  prop matches Section 10's table for whatever state that response
  returned — a mismatched tone (e.g., `destructive` shown for a
  `completed` state) is the fastest visual signal something regressed.
- **Debugging entry points.** No new entry point — `lib/services/analysisSessions.ts`
  remains the one place to inspect a session's real data; this
  milestone's own bugs (if any) would be presentation bugs, isolated to
  the four modified component files in Section 9.

---

*End of design specification. Awaiting review before any implementation
begins.*
