# Atlas AI — Milestone 28 Design Specification

**Real Identity in the UI (Finishing Milestone 27)**

Status: **Design only. No code, no folders, no source files modified.
No migrations. No commits.**

**Revision note:** this document was revised after a formal Principal
Architect review (full review preserved in project history, not
duplicated here). Every required change from that review is either
implemented in this revision or explicitly resolved by a stated
engineering judgment call — see the "Review Resolution Log" immediately
below. Nothing in this revision was changed just to be seen responding
to the review; each change is justified on its own merits.

---

## Review Resolution Log

| Review finding | Resolution | Reasoning |
|---|---|---|
| Display-name derivation duplicated/inconsistent across `ProfileMenu`/`DashboardWelcome` | **Fixed.** One shared `lib/format.ts` helper, used identically by both call sites (Section 6, Deliverable 1). | Direct architectural inconsistency; no reason not to fix. |
| No return-URL after sign-in, including on protected routes | **Fixed.** `redirectTo` support added, with explicit open-redirect protection (Section 6, Deliverables 6–8). | Real UX gap on protected routes, not just the public analysis page; the fix is small and well-established. |
| In-progress analysis silently abandoned on sign-in/sign-out navigation | **Fixed.** A native `confirm()` guard, reading the existing `useSessionStore`, blocks navigation while a session is active (Section 6, Deliverable 2). | Real data-loss risk; the fix reuses existing shared state with zero new UI. |
| Acceptance criteria gaps (accessibility, `NotificationsMenu`, redirectTo, measurement method) | **Fixed.** Section 12 rewritten. | Directly actionable, no trade-off to weigh. |
| `NotificationsMenu` never actually audited | **Fixed.** Verified directly this revision (see Pre-Design Audit) — confirmed already-honest, zero hardcoded content, no changes needed. | Closes a real audit gap. |
| `cache()` added without measurement, against `CLAUDE.md`'s own performance philosophy | **Judgment call: dropped.** Not part of this milestone. | `CLAUDE.md` Section 15 is explicit that speculative caching for an unmeasured cost should wait for measurement. Dropping it also fully removes the `cache()`/`next/cache` naming-collision security risk the review raised — the simplest resolution, not a compromise. If the duplicate `getCurrentUser()` call is ever measured to matter, it's a small, separately-justified follow-up. |
| Navbar wiring bundled into an identity-scoped milestone | **Judgment call: cut from scope.** Moved to Non-Goals. | It's a navigation fix, not an identity fix. Removing it shrinks the diff and makes the milestone's name accurate to its content — strictly simpler, not a compromise. Belongs with Phase 3 Theme B ("close the visible product gaps") instead. |
| Milestone should arguably be "27.5," not "28" | **Judgment call: kept as 28**, framing clarified. | Renaming is disruptive relative to the benefit (a communication/labeling concern, not functional) — Milestone 27 is already committed and pushed under that name. Section 1 below now states plainly, without hedging, that this is completion work, not new capability, so the number can't be misread by anyone who reads the document. |

---

## Pre-Design Audit

Every claim below is a direct read of the current codebase, including one
new check this revision performed to close a gap the review found.

- **`components/dashboard/shell/ProfileMenu.tsx`** — hardcodes
  `"Yasin"` / `"Founder"` and avatar fallback `"Y"`. `"use client"`.
- **`components/dashboard/home/DashboardWelcome.tsx`** — hardcodes
  *"Good to see you, Yasin."* Server Component.
- **`components/dashboard/shell/Header.tsx`** → renders `<ProfileMenu />`
  with no props today.
- **`components/dashboard/shell/AppShell.tsx`** — `"use client"`,
  rendered by `app/dashboard/layout.tsx` (a plain Server Component, zero
  data fetching today), wraps **both** `/dashboard` (protected) and
  `/dashboard/analysis` (deliberately public). This shared-chrome fact
  remains the single most important constraint on this design.
- **`components/dashboard/home/DashboardHome.tsx`** — renders
  `<DashboardWelcome />` with no props; its caller,
  `app/dashboard/page.tsx`, already calls `getCurrentUser()` today
  (Milestone 27c).
- **`components/dashboard/shell/NotificationsMenu.tsx`** — **newly
  verified this revision**, read in full: renders a static, honest
  empty state ("You're all caught up... New activity on your projects
  will show up here"), no hardcoded name, no fabricated notification
  data, not identity-dependent in any way. **Confirmed out of scope,
  zero changes required** — this closes the review's audit-completeness
  finding with a direct answer rather than a renewed assumption.
- **`lib/services/auth.ts`**'s `getCurrentUser()` returns
  `{ id: string, email: string | null } | null` — no display name field
  exists anywhere; sign-up only ever collects email + password.
- **`app/login/page.tsx`** / **`app/signup/page.tsx`** — labeled
  "TEMPORARY... not final product UI." On success, `/login` calls
  `router.refresh()` and does not navigate anywhere.
- **`middleware.ts`** — redirects an unauthenticated visitor away from
  `/dashboard`, `/projects`, `/settings`, but does not carry any
  information about where they were trying to go, and does not redirect
  an already-authenticated visitor away from `/login`/`/signup`.
- **`lib/store/sessionStore.ts`** (Zustand, existing, unchanged by
  Milestone 27) exposes `status: "idle" | "starting" | "polling" |
  "error"` and `view`, readable from **any** component — this is the
  exact, already-existing mechanism this revision uses to detect an
  in-progress analysis from `ProfileMenu`/`Header`, with zero new
  state-sharing pattern introduced.
- **`components/layout/Navbar.tsx`** — "Sign In"/"Get Started" are
  fully decorative `<Button>` elements, no `href`. Confirmed again this
  revision; **now explicitly out of scope** (Review Resolution Log).

---

# 1. Goal

**Exact purpose:** replace every remaining hardcoded "Yasin / Founder"
identity reference with the real, signed-in user's identity, and give
`/login`/`/signup` their final, on-brand form.

**This is completion work, not new product capability — stated
plainly, not hedged.** Every deliverable in this document was already
named as the remaining piece of the Milestone 27 sub-sequence in that
milestone's own design document (there called "27d"). It is numbered as
Milestone 28 for practical continuity with already-committed history
(Milestone 27 is closed and pushed; retroactively renumbering or
merging into it would mean rewriting shared git history, which this
project's own workflow rules forbid), **not** because it represents a
new unit of product value comparable to Milestones 24–27. Anyone
comparing milestone numbers as a proxy for scope should read this note
first.

**User problem solved:** today, every visitor — signed in or not — sees
the identical fake name in the dashboard shell, has no way to sign out,
and has no way to reach sign-in/sign-up from the marketing site. A
founder who creates a real account gets no visible confirmation the app
knows who they are.

**Why now:** Milestone 27 built the entire mechanism this milestone
surfaces. Leaving the UI hardcoded is the one remaining place this
codebase is visibly, avoidably dishonest about its own state — directly
contradicting `CLAUDE.md`'s stated "never fabricate" philosophy, so far
applied to data but not chrome.

**Fit with long-term architecture:** zero service-layer or data-model
surface touched. A pure UI/presentation consumer of `getCurrentUser()`,
the seam Milestone 27 built for exactly this.

---

# 2. Scope

### IN scope

1. `ProfileMenu` shows the real signed-in user (shared-helper-derived
   display name + email + avatar initial) and a working "Sign out"
   action guarded against discarding an in-progress analysis; for an
   anonymous visitor on `/dashboard/analysis`, an honest "Sign in" link
   (carrying a `redirectTo`), also guarded the same way.
2. `DashboardWelcome` greets the real signed-in user by the same
   shared-helper-derived display name.
3. `/login` and `/signup` become permanent product UI: on-brand styling,
   no "temporary" labeling, real post-success navigation honoring
   `redirectTo` where present.
4. `redirectTo` support: middleware attaches it when redirecting an
   unauthenticated visitor away from a protected path; `/login`/`/signup`
   read and honor it, with explicit validation against open-redirect
   abuse.
5. `middleware.ts` gains the symmetric redirect: an already-authenticated
   visitor hitting `/login`/`/signup` is redirected to `/dashboard`.
6. A confirmation guard before navigating away from an in-progress
   analysis via the new sign-in/sign-out affordances.
7. One shared display-name derivation helper in `lib/format.ts`, used
   identically by every consumer.

### OUT of scope (explicit)

- Collecting or editing a real display name, avatar image, or any
  profile field beyond what Supabase Auth already stores.
- Any change to `/settings`.
- Any OAuth provider.
- Any change to session lifecycle, RLS, ownership, or the `projects`
  table.
- Any change to `/dashboard/analysis`'s or the analysis-session API's
  public accessibility.
- **`components/layout/Navbar.tsx`'s decorative Sign In/Get Started
  buttons** — real, pre-existing gap, but a navigation fix rather than
  an identity fix; deliberately deferred to Phase 3 Theme B ("close the
  visible product gaps"), not bundled here (Review Resolution Log).
- **`getCurrentUser()` memoization/`cache()`** — the known, accepted
  duplicate auth call this milestone's own layout-level fetch introduces
  is left as-is, deliberately, pending actual measurement (Review
  Resolution Log; restated in Section 10).
- `NotificationsMenu` — verified, needs no changes (Pre-Design Audit).

**No ambiguous boundary:** anything not in Section 3 is a non-goal
(Section 4 restates this).

---

# 3. Deliverables

1. **`lib/format.ts`** gains `formatDisplayName(email: string): string`
   — the **one** shared derivation (email local-part, e.g. `eshagy7`
   from `eshagy7@gmail.com`), used by every consumer below. No second
   implementation anywhere.
2. **`components/dashboard/shell/ProfileMenu.tsx`** accepts
   `user: { email: string; displayName: string } | null`.
   - Present → shows `displayName` (bold) and `email` (secondary line,
     replacing the old "Founder" line — confirms which account is
     signed in, useful for anyone managing more than one), avatar
     fallback shows `displayName`'s first letter uppercased, and a real
     "Sign out" `MenuItem`.
   - Absent → renders a "Sign in" link to
     `` `/login?redirectTo=${currentPath}` `` instead of a menu.
   - **Both** the "Sign out" action and the "Sign in" link check
     `useSessionStore`'s `status`/`view` (the same "is an analysis
     active" condition `AIWorkspace` already computes as `isBusy`)
     before navigating; if active, a native `confirm()` warns that
     navigating now discards the in-progress analysis, and only
     proceeds on confirmation.
3. **`components/dashboard/home/DashboardWelcome.tsx`** accepts
   `displayName: string`, rendered via the same shared helper.
4. **`app/dashboard/layout.tsx`** becomes `async`, calls
   `getCurrentUser()` once, derives `{ email, displayName }` via
   `formatDisplayName`, passes it down through `AppShell` → `Header` →
   `ProfileMenu`.
5. **`app/dashboard/page.tsx`** threads its already-fetched `user`
   through `DashboardHome` → `DashboardWelcome` as `displayName`
   (`formatDisplayName(user.email)`).
6. **`app/login/page.tsx`** — redesigned: real branding, no "temporary"
   labeling anywhere. Reads `redirectTo` from search params via
   `useSearchParams()`; on successful sign-in, validates it (must be a
   same-origin relative path starting with a single `/`, never `//` or
   a URL with a scheme) and navigates there, falling back to
   `/dashboard` if absent or invalid.
7. **`app/signup/page.tsx`** — same visual treatment and `redirectTo`
   handling as `/login`, applied only when sign-up grants an immediate
   session; otherwise the existing "check your email" message is
   unchanged.
8. **`middleware.ts`** — two additions: (a) when redirecting an
   unauthenticated visitor away from a protected path, appends
   `?redirectTo=<the original pathname>` to the `/login` redirect;
   (b) redirects an already-authenticated visitor away from
   `/login`/`/signup` to `/dashboard`.

Nothing else changes.

---

# 4. Non-Goals

- Collecting a real display name, profile photo, or any editable
  profile field — the display name is mechanically derived, never
  asked for or stored.
- Building out `/settings`.
- OAuth sign-in.
- Password reset UI beyond Supabase Auth's own default flow.
- Any change to `NotificationsMenu` (verified this revision, needs
  none).
- Rate limiting on `/login`/`/signup` (already-tracked, separate open
  item).
- Any RLS, ownership, or session-lifecycle change.
- **`components/layout/Navbar.tsx`'s CTAs** — explicitly deferred, not
  this milestone's job (Section 2).
- **`getCurrentUser()` memoization** — explicitly deferred pending
  measurement (Section 2, Section 10).
- Any confirmation/guard UI beyond the one native `confirm()` described
  in Deliverable 2 — no new custom modal component.

---

## Future Identity (Out of Scope)

This milestone intentionally does **not** introduce a complete user
profile system. The identity surfaced throughout this design is
deliberately minimal, and that is a scope decision, not an oversight:

- The displayed identity is derived mechanically from the authenticated
  user's email, via the one shared `formatDisplayName()` helper — never
  collected from the user, never edited, never stored as its own field.
- **Editable display names** are intentionally deferred to a future,
  separately-scoped profile milestone.
- **Avatars / profile photos** are intentionally deferred — the avatar
  fallback shows a derived initial only, never an uploaded or
  externally-fetched image.
- **Account/profile management** (a real `/settings` page, changing
  email or password from within the app, etc.) is intentionally
  deferred.
- **Organization/workspace identities** (teams, shared ownership,
  multi-user projects) are intentionally deferred — `owner_id` remains
  a single user id, unchanged from Milestone 27c.

**Nothing implemented in Milestone 28 should prevent any of these
future capabilities.** The prop shapes introduced here
(`{ email, displayName } | null`) are additive-friendly — a future
milestone can extend them with new optional fields (`avatarUrl`,
`fullName`, `workspaceId`, etc.) without breaking this milestone's own
contract, and `formatDisplayName()` is the one, obvious place a future
"real display name" feature would change its internals without
touching any call site.

---

# 5. User Flows

### Flow A — Anonymous visitor signs up

1. Visits `/signup` directly (Navbar wiring is out of scope this
   milestone — reachable today only via direct URL or the existing
   in-app links, unchanged from before).
2. Submits email/password.
3a. Confirmation required → "check your email" message, stays on
    `/signup`.
3b. Immediate session → navigates to `redirectTo` if present and valid,
    else `/dashboard`.

### Flow B — Returning user signs in, redirected from a protected page

1. Visits `/projects` while signed out → middleware redirects to
   `/login?redirectTo=/projects`.
2. Signs in successfully → navigates to `/projects`, **not**
   `/dashboard` (the concrete fix for the review's highest-priority UX
   finding).
3. On failure: existing inline `Alert`, stays on `/login` with
   `redirectTo` preserved in the URL for a retry.

### Flow C — Authenticated user visits `/dashboard`

Unchanged in substance from the prior revision — `Header`/`ProfileMenu`
show the real, shared-helper-derived name and email;
`DashboardWelcome` greets them by the same name.

### Flow D — Authenticated user signs out, no analysis in progress

1. Opens the profile menu, clicks "Sign out."
2. `useSessionStore`'s status is `idle` (or a prior analysis is already
   terminal) → no confirmation shown; `signOut()` runs, navigates to `/`.
3. A later visit to `/dashboard`/`/projects` correctly redirects to
   `/login` (unchanged, Milestone 27b/27c).

### Flow E — Authenticated user attempts to sign out mid-analysis

1. Is on `/dashboard/analysis`, an analysis is actively polling
   (`status === "polling"`, non-terminal).
2. Clicks "Sign out" → a native confirm dialog states the in-progress
   analysis will be lost if they continue.
3. **Cancel** → nothing happens, they remain signed in, analysis keeps
   running.
4. **Confirm** → proceeds exactly as Flow D.

### Flow F — Anonymous visitor on `/dashboard/analysis` (shared, public
route), with or without an active analysis

1. Sees the "Sign in" link in place of any identity in the Header.
2. **No analysis active:** clicking it navigates immediately to
   `/login?redirectTo=/dashboard/analysis`.
3. **Analysis active:** the same confirm-before-navigating guard as
   Flow E applies — clicking "Sign in" while a report is generating
   warns before leaving.
4. After signing in (in either case), lands back on
   `/dashboard/analysis` — **not** `/dashboard` — directly resolving the
   review's finding, though the in-progress run itself is still not
   recoverable once navigation actually happens (accepted; the guard's
   entire purpose is making that an informed choice, not preventing it
   outright).

### Flow G — Already-authenticated user manually visits `/login`

Unchanged — middleware redirects to `/dashboard` before the page
renders.

### Edge case — invalid or malicious `redirectTo`

1. A crafted URL like `/login?redirectTo=https://evil.example.com` or
   `/login?redirectTo=//evil.example.com` is visited.
2. Validation (Deliverable 6) rejects anything that isn't a single
   leading `/` followed by a non-`/` character — both examples fail
   this check — and falls back to `/dashboard` silently. No open
   redirect is possible.

### Edge case — session expires mid-visit

Unchanged from the prior revision — `ProfileMenu` falls back to the
anonymous "Sign in" state automatically on the next render.

---

# 6. Architecture

### Frontend changes

- **One shared derivation, two consumers** — `lib/format.ts`'s
  `formatDisplayName()` is called once at each of the two Server
  Component points that need it (`app/dashboard/layout.tsx`,
  `app/dashboard/page.tsx`), never re-implemented, directly resolving
  the review's top architectural finding. Both consuming components
  receive already-derived strings, not raw email plus an implicit
  expectation that they'll derive it themselves.
- **The in-progress-analysis guard reuses `lib/store/sessionStore.ts`
  as-is** — no new state-sharing mechanism. `ProfileMenu` reads
  `useSessionStore`'s `status`/`view` directly, the same store
  `AIWorkspace` already reads, computing the identical "is busy"
  condition `AIWorkspace` itself already uses. This is precisely what
  Zustand is for (`CLAUDE.md` Section 7) — cross-component shared state
  with no direct parent-child relationship carrying it.
- `Header`/`AppShell` gain pass-through props with no logic of their
  own, unchanged in kind from the prior revision.

### Backend / services changes

None beyond what already exists. `getCurrentUser()`'s signature and
behavior are completely unchanged in this revision — the `cache()`
wrap proposed earlier is deliberately not part of this milestone
(Section 2).

### APIs

None, new or changed — restated from the prior revision; still fully
accurate.

### Database / Supabase usage

None.

### Caching

**None introduced.** The prior revision's `cache()` proposal is
dropped. The one known, accepted cost this creates: a request to
`/dashboard` or `/dashboard/analysis` now makes two `getCurrentUser()`
calls (one from the new layout-level fetch, one from the existing
page-level fetch) instead of one. This is stated plainly as a known,
measured-as-acceptable trade-off, not a silent gap — see Section 10.

### Authentication impact

The `redirectTo` mechanism is the one genuinely new piece of logic this
revision adds to the authentication surface. It is **read-only
routing information, never a trust decision** — `redirectTo` is never
used to decide *whether* someone is authenticated, only *where* to send
them once they are. Validated strictly (Deliverable 6) against
open-redirect abuse before ever being used in a `router.push()` or
`NextResponse.redirect()` call.

### Security impact

- The `redirectTo` validation is the one place this milestone
  introduces real, novel attack surface (an open redirect, if done
  carelessly) — mitigated by requiring a strict relative-path shape
  (single leading `/`, not `//`, no scheme) checked on both the
  middleware side (constructing it) and the page side (consuming it) —
  belt and suspenders, not trusting either end alone.
- The confirm-before-navigating guard has no security implication —
  purely a data-loss prevention UX measure.
- Dropping `cache()` also fully removes the cross-user-identity-leak
  risk a careless `next/cache` implementation could have introduced —
  a direct, positive security consequence of the judgment call in
  Section 2, not merely a neutral simplification.

---

# 7. Data Model

**No schema changes.** Unchanged from the prior revision.

---

# 8. API Contract

No new or changed custom API route — unchanged from the prior
revision. The Supabase Auth SDK contract (`signInWithPassword`,
`signUp`, `signOut`) is unchanged in shape; the only difference is what
the *client code* does with a successful response (navigate to
`redirectTo` or `/dashboard`, versus always `/dashboard`).

`redirectTo` itself is carried as a plain URL search parameter, not a
new API — validated identically wherever it's read (Deliverable 6).

---

# 9. Security Review

- **Authentication requirement:** unchanged.
- **Authorization requirement:** none new.
- **RLS implications:** none.
- **New abuse scenario considered and closed:** open redirect via a
  crafted `redirectTo` value — closed by strict same-origin,
  relative-path-only validation (Section 6, Edge case in Section 5).
- **Abuse scenario reconsidered from the prior revision:** a careless
  `cache()`/`next/cache` mix-up causing cross-user identity leakage —
  **no longer applicable**, since `cache()` isn't part of this
  milestone at all.
- **Privacy considerations:** unchanged from the prior revision — the
  email-derived name and the email itself are shown only to the
  account they belong to.
- **Logout's new call site** (`ProfileMenu`, nested in the mobile-drawer/
  framer-motion tree) — still not yet empirically retested against the
  proven `/login` mechanism; named explicitly in Risks (Section 11) as
  something to verify at implementation/QA time, not assumed safe by
  similarity.

---

# 10. Performance Review

- **Database queries:** zero new.
- **New network calls:** the same duplicate `getCurrentUser()` call
  named in the prior revision, **now deliberately left unaddressed**.
  Stated precisely: this is one extra, cheap Supabase Auth `getUser()`
  round-trip per request to `/dashboard` or `/dashboard/analysis`. Per
  `CLAUDE.md`'s own performance philosophy, this should be measured
  before it's optimized, not assumed to matter — a proportionate,
  explicit trade-off, not an oversight.
- **Client rendering:** the new `confirm()` guard is a synchronous,
  blocking native dialog — used only on two low-frequency,
  user-initiated actions (sign-in/sign-out clicks), negligible cost,
  and only shown at all when an analysis is genuinely active.
- **Server rendering:** unchanged reasoning from the prior revision.
- **Caching opportunities:** deliberately not taken in this milestone
  (Section 2).
- **Scalability concerns:** none new.

---

# 11. Risks

- **UX risk, now mitigated rather than merely accepted:** in-progress
  analysis loss — closed by the `confirm()` guard (Deliverable 2),
  downgraded from the prior revision's "high, unconsidered" to "low,
  explicitly handled, native-dialog UX is not polished but is honest
  and functional."
- **Security-adjacent risk:** `redirectTo` validation must actually be
  implemented correctly (single leading `/`, rejecting `//` and
  scheme-carrying values) — flagged as the one piece of this milestone
  that needs a careful, tested implementation, not a rushed one.
- **Technical risk:** the duplicate `getCurrentUser()` call, left
  unaddressed by deliberate choice — low risk today, worth revisiting
  if `/dashboard`/`/dashboard/analysis` traffic or Supabase Auth latency
  ever make it measurably relevant.
- **UX risk, unchanged:** the email-derived display name is honest but
  not polished — accepted, a future profile milestone's job.
- **Security risk, named but not newly introduced:** `ProfileMenu`'s
  new "Sign out" call site is unverified against the proven `/login`
  mechanism — low probability, explicit QA item (Section 13).
- **Migration risk:** none.
- **Rollback plan:** unchanged — every change is additive/prop-threading
  plus the `redirectTo` mechanism and one Zustand read; reverting the
  commit fully restores prior behavior.
- **Compatibility risk:** `ProfileMenu`/`DashboardWelcome`'s prop
  signatures change again from the prior revision's own draft shapes
  (now `{ email, displayName }` and `displayName`, respectively) —
  confirmed, as before, that no other caller exists for either
  component.
- **Process risk, addressed:** the "Milestone 28 vs. 27.5" labeling
  question — resolved by explicit framing in Section 1, not left
  ambiguous.

---

# 12. Acceptance Criteria

1. [ ] Signed-in `ProfileMenu` shows the shared-helper-derived display
   name and the real email, matching the signed-in account.
2. [ ] The avatar fallback shows the correct initial, derived from the
   same display name.
3. [ ] "Sign out" with no in-progress analysis clears the session
   immediately (no confirm dialog), confirmed by `/dashboard`
   redirecting to `/login` on the next visit.
4. [ ] "Sign out" *with* an in-progress analysis (`status === "polling"`
   or equivalent non-terminal state) shows a native confirmation;
   canceling it leaves the session and the in-progress analysis
   untouched; confirming it proceeds exactly as (3).
5. [ ] Anonymous visitor on `/dashboard/analysis` sees a "Sign in" link,
   never a fabricated identity or a broken menu.
6. [ ] The same in-progress-analysis confirmation guard applies to the
   "Sign in" link, not only "Sign out."
7. [ ] `DashboardWelcome` greets the signed-in user with the same
   display name shown in `ProfileMenu` — verified to be the literal
   same string, computed by the literal same function.
8. [ ] Signing in from a middleware-triggered redirect returns the user
   to the original protected path (e.g., `/projects`), not
   unconditionally `/dashboard`.
9. [ ] Signing in via the Header's own "Sign in" link from
   `/dashboard/analysis` (a redirectTo constructed by `ProfileMenu`
   itself, not by middleware — a distinct code path from (8)) returns
   the user to `/dashboard/analysis` specifically, not `/dashboard`.
10. [ ] Signing in with no `redirectTo` present falls back to
    `/dashboard`.
11. [ ] A crafted `redirectTo` (absolute URL, protocol-relative `//`, or
    any value not starting with a single `/`) is rejected and falls
    back to `/dashboard` — verified with at least one concrete malicious
    example, not just the happy path.
12. [ ] Visiting `/login` or `/signup` while already signed in redirects
    to `/dashboard` before the form renders.
13. [ ] The new "Sign in" link and "Sign out" menu item both have
    visible focus states and correct accessible labeling, consistent
    with `CLAUDE.md` Section 9's existing accessibility requirements —
    not a new gap added to the already-tracked list.
14. [ ] `NotificationsMenu` is confirmed unchanged (`git diff` shows zero
    modification to this file).
15. [ ] `components/layout/Navbar.tsx` is confirmed unchanged — this
    milestone does not touch it (Section 2).
16. [ ] `tsc --noEmit` and `eslint` both pass with zero new errors.
17. [ ] `next build` succeeds with the same route count as before this
    milestone.
18. [ ] No table, column, or RLS policy changed — confirmed via `git
    diff` touching zero files under `supabase/migrations/`.

---

# 13. Verification Plan

**Manual tests:**
- Sign in with a real account from a direct `/login` visit (no
  `redirectTo`) → lands on `/dashboard`.
- Sign in after being redirected from `/projects` by middleware → lands
  on `/projects`, not `/dashboard` (Acceptance Criterion 8).
- Sign in via the Header's own "Sign in" link from
  `/dashboard/analysis` → lands back on `/dashboard/analysis`, not
  `/dashboard` (Acceptance Criterion 9 — a distinct code path from the
  middleware case above, must be tested separately, not assumed to work
  just because the middleware case does).
- Manually craft a malicious `redirectTo` query string and confirm the
  fallback behavior (Acceptance Criterion 11) — this must be tested
  directly, not assumed from reading the validation code.
- Start an analysis on `/dashboard/analysis` while signed in, then click
  "Sign out" mid-poll → confirm dialog appears; test both Cancel and
  Confirm paths.
- Repeat the above signed out, using the "Sign in" link instead.
- Visit `/login` while already signed in → immediate redirect.

**Automated tests:** none exist in this codebase today — unchanged,
not introduced by this milestone.

**Production verification:** not applicable beyond the existing
Supabase project used throughout Milestone 27's own verification.

**Edge-case testing:**
- Session expiring mid-visit — unchanged from prior revision.
- Sign-up requiring email confirmation — unchanged.
- The open-redirect `redirectTo` case (Section 5) — must be tested with
  a real crafted URL, not just code-reviewed.
- An email address with unusual local-part characters — confirm
  `formatDisplayName()` doesn't throw.

**Regression testing:** re-run the full Milestone 27c verification
checklist (anonymous analysis start/poll/cancel; authenticated project
persistence; `/projects`/`/dashboard`/History panel correctness) to
confirm this milestone is additive-only to that surface. Additionally
confirm `NotificationsMenu` and `Navbar` are byte-for-byte unchanged.

---

# 14. Implementation Plan

**Sub-milestone 28.1 — Shared helper + data plumbing**
- *Purpose:* one derivation function, threaded to both consumers,
  before any visual component changes.
- *Files:* `lib/format.ts`, `app/dashboard/layout.tsx`,
  `app/dashboard/page.tsx`.
- *Outcome:* no visible change yet — props exist and are correctly
  derived, not yet consumed by their target components.
- *Dependencies:* none.

**Sub-milestone 28.2 — ProfileMenu, DashboardWelcome, and the
in-progress-analysis guard**
- *Purpose:* consume 28.1's props; add the `useSessionStore`-based
  confirm guard to both the "Sign out" action and the new "Sign in"
  link.
- *Files:* `components/dashboard/shell/ProfileMenu.tsx`,
  `components/dashboard/shell/Header.tsx`,
  `components/dashboard/shell/AppShell.tsx`,
  `components/dashboard/home/DashboardWelcome.tsx`,
  `components/dashboard/home/DashboardHome.tsx`.
- *Outcome:* Flows C, D, E, F fully working except for the `redirectTo`
  destination itself (28.3 supplies that).
- *Dependencies:* 28.1.

**Sub-milestone 28.3 — `redirectTo` + login/signup real UI + symmetric
redirect**
- *Purpose:* the return-URL mechanism, with validation, plus the
  finished auth pages.
- *Files:* `middleware.ts`, `app/login/page.tsx`, `app/signup/page.tsx`.
- *Outcome:* Flows A, B, G fully working; the open-redirect edge case
  closed and tested.
- *Dependencies:* none technically, but should land after 28.2 so the
  "Sign in" link's `redirectTo` query param has a real consumer to test
  against end to end.

Each sub-milestone gets its own `tsc`/`eslint`/manual-check pass before
the next begins, per this project's established discipline. There is no
Sub-milestone for Navbar or `cache()` — both are explicitly out of
scope (Section 2).

---

# 15. Final Review — Self-Critique (This Revision)

- **Did resolving the review introduce new complexity that isn't
  earning its keep?** The `redirectTo` mechanism is the one genuinely
  new piece of logic in this revision. It is justified — it fixes a
  real, previously-identified UX defect on protected routes, and its
  validation requirement is a well-known, small, necessary pattern, not
  speculative infrastructure. The `confirm()` guard is a single native
  browser API call gated on already-existing shared state — effectively
  free in implementation cost for the risk it closes.
- **Duplicated logic:** resolved — one `formatDisplayName()`, two call
  sites, verified as Acceptance Criterion 7.
- **Was dropping `cache()` the right call, or did it just avoid
  short-term review pressure?** Re-examined here specifically: the
  duplicate call is real but cheap (a single Supabase Auth check), this
  project's own stated philosophy argues against pre-measurement
  optimization, and dropping it also removes a security-adjacent risk
  entirely rather than requiring careful guarding. This holds up under
  a second look, not just the first.
- **Was cutting Navbar the right call?** Yes on reflection too — it
  doesn't reduce this milestone's own risk or complexity to keep it;
  it only makes the diff marginally larger for a concern the milestone's
  own name doesn't cover.
- **Anything still deliberately left unresolved?** The email-derived
  display name's lack of polish (Section 11) — correctly a future
  milestone's job, not something to solve by inventing a
  profile-editing feature here.

---

*End of design specification, revised. Awaiting approval before
Sub-milestone 28.1 begins. No code has been written or modified.*
