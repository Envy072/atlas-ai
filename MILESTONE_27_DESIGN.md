# Atlas AI — Milestone 27 Design Specification

**Authentication Architecture**

Status: **Design only. No code, no folders, no source files, no migrations
modified. No commits, no pushes.**

This is Phase 3 Theme A's second item (`ATLAS_AI_PHASE_3_REVIEW.md`
Section 6: *"Authentication... named as a hard, blocking dependency by
two separate milestones already"*), and closes Roadmap Milestone 4 from
the original `CLAUDE.md` roadmap (*"A real `lib/services/auth.ts`
session model, replacing the hardcoded 'Yasin / Founder' identity. Every
project gains an owner; user-specific routes gate behind a real session
check."*). It follows Milestone 26 (Project Persistence), which added a
reserved, always-`null` `ownerId` field to `Project` in direct
anticipation of this milestone.

---

## Part 1 — Complete Architectural Audit

Every claim below is a direct search/read of the current working tree
performed in this session, not a recollection of prior documents.

### 1.1 Search: every auth-related file

```
find . -iname "*auth*" (excluding node_modules/.next/.git)  →  ZERO results
```

There is no `auth/` folder, no `lib/services/auth.ts`, no `AuthProvider`,
no `useAuth`, no `useUser` hook — nothing. This is not a cleanup
milestone like Milestone 25 (dead code to retire); it is a genuine blank
slate.

### 1.2 Search: middleware

```
find . -maxdepth 2 -iname "middleware.ts"  →  ZERO results
```

No `middleware.ts` exists anywhere in the project. No request is
intercepted, inspected, or redirected before reaching a route today.

### 1.3 Search: Supabase auth usage

```
grep -rl "supabase.auth\|auth.getUser\|auth.getSession\|auth.signIn\|
           auth.signOut\|auth.signUp"  →  ZERO results
```

`lib/supabase.ts` (the one existing Supabase client) is used exclusively
for `.from("projects")` table queries (`lib/services/projects.ts`). The
Supabase Auth API is never called anywhere in this codebase.

### 1.4 Search: login/logout/session handling

```
grep -rl "login|logout|signIn|signOut|signUp|Login|Logout|Signin|Signup"
  →  ZERO results
grep -rl "cookies\(\)|next/headers|getServerSession|jwt|JWT"  →  ZERO results
```

No login form, no logout action, no session read/write of any kind —
not even a cookie read. `package.json` confirms this at the dependency
level: only `@supabase/supabase-js` (the base client) is installed.
Neither `@supabase/ssr` (Supabase's current, documented package for
Next.js App Router cookie-based sessions) nor `@supabase/auth-helpers-nextjs`
(its deprecated predecessor) nor any third-party auth library
(`next-auth`, `@clerk/nextjs`, etc.) is present.

### 1.5 Search: protected routes

Every route was checked directly:

- `app/dashboard/layout.tsx` wraps `/dashboard` and `/dashboard/analysis`
  in `AppShell` — with **zero access check**. Any visitor, authenticated
  or not, reaches both today.
- `app/projects/page.tsx`, `app/competitors/page.tsx`,
  `app/research/page.tsx`, `app/reports/page.tsx`,
  `app/settings/page.tsx`, `app/pricing/page.tsx`,
  `app/templates/page.tsx` — none import or check anything auth-related.
- All four API routes (`app/api/analysis-sessions/route.ts` and its
  three `[id]/...` siblings) were read in full: each parses/validates
  its request body, calls exactly one service function, and maps the
  result via `jsonSuccess`/`jsonError` — **no route reads a user
  identity, a header, or a cookie, anywhere.**

**Every route in this application is effectively public today.**

### 1.6 Search: anonymous flows

Not a partial gap — the **entire product** is one large anonymous flow.
A visitor can load `/dashboard`, submit an idea, receive a full
`DecisionReport`, and (as of Milestone 26) have it persisted, all
without any identity ever being established or checked.

### 1.7 Search: `owner_id` usage

```
lib/schemas/project.ts:20:   ownerId: z.string().nullable(),
lib/services/projects.ts:19,31,104,122   (mapping/always-null-write only)
```

`ownerId` exists only as a reserved column, written as `null` on every
insert (`persistProjectFromSession`, Milestone 26, by explicit,
documented design). It is never read, never compared, never filtered
on. `listProjects()` still selects and returns **every row in the
table** with no `WHERE owner_id = ...` clause — every visitor sees every
project ever created, an existing and current data-exposure gap this
milestone must close, not merely prepare for.

### 1.8 Search: RLS policies

```
grep -rn "create policy|CREATE POLICY|enable row level security" *.sql
  →  ZERO results (supabase/migrations/ contains only Milestone 26's
     two column/index migrations — no policy statements anywhere)
```

Confirms `CLAUDE.md` Section 16's own long-standing, previously
unverified concern directly: *"This repo doesn't contain that policy
definition, and it hasn't been verified in any sprint so far."* Today,
the `projects` table's anon-key access is unrestricted by any database-level
rule — every reader of this codebase relies entirely on
`listProjects()`'s own application-layer query, which (1.7) has no
scoping at all.

### 1.9 Search: environment variables

```
.env.local keys: BRAVE_API_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY,
NEXT_PUBLIC_SUPABASE_URL, OPENAI_API_KEY, TAVILY_API_KEY
```

No auth-related secret exists — no `SUPABASE_SERVICE_ROLE_KEY`, no
session/JWT secret, nothing OAuth-provider-specific. Only the public,
RLS-dependent anon key is configured (consistent with `CLAUDE.md`
Section 16's existing warning about what that key's safety actually
depends on).

### 1.10 Search: dashboard access / hardcoded identity

`components/dashboard/shell/ProfileMenu.tsx` and
`components/dashboard/home/DashboardWelcome.tsx` both hardcode the name
"Yasin" / role "Founder" directly in JSX, each with an honest code
comment acknowledging this: *"there's no auth/session model yet
(CLAUDE.md Roadmap Milestone 4)."* `ProfileMenu.tsx` deliberately omits
a "Sign out" action for the same stated reason — *"rather than
fabricating account actions... the app can't actually perform yet."*
Both are correctly-scoped, honest placeholders, not something requiring
"cleanup" — just replacement once a real identity exists.

### 1.11 Search: API authentication

Exhaustively covered in 1.5 — zero. Additionally, a **compounding**
finding: `AnalysisSession` ids are generated by
`lib/analysis-session/utils/id.ts`'s `nextSessionId()` as
`` `session_${Date.now()}_${sessionIdCounter}` `` — a timestamp plus a
small, in-process, sequentially-incrementing counter, not a
cryptographically random value. Combined with zero authentication, any
visitor can read (`GET`), cancel (`POST .../cancel`), or retry
(`POST .../retry`) **any other visitor's session**, including ones they
didn't start, simply by guessing or enumerating nearby ids. This is a
real, currently-exploitable gap, worth fixing as part of this
milestone's hardening even though it is technically a pre-existing,
separate issue from "no auth" itself.

### 1.12 Dead / duplicate auth code

**None exists.** Unlike Milestone 25 (which found and retired 79 files
of dead analysis-flow code), there is nothing to delete here — this
audit found a blank slate, not debris.

### 1.13 Summary table

| Area | Current state |
|---|---|
| Identity provider | None |
| Session mechanism | None |
| Middleware | None |
| Route protection (pages) | None — all routes public |
| Route protection (API) | None — all 4 routes accept any caller |
| Ownership enforcement | None — `ownerId` always `null`, never filtered on |
| RLS | None defined |
| Auth-related env vars | None |
| Auth-related dependencies | None (`@supabase/ssr` not installed) |
| Session id security | Sequential/guessable, compounding the no-auth gap |
| Dead/duplicate auth code | None (blank slate) |

---

## Part 2 — Security Review (of the current, pre-Milestone-27 state)

1. **Full data exposure.** Every persisted `Project` (Milestone 26) —
   including its complete `DecisionProfile`, which may describe a real,
   unannounced startup idea a founder considers sensitive — is readable
   by any visitor via `/projects`, with no login required. This is the
   single most serious current gap this milestone must close.
2. **No caller-identity binding for analysis sessions.** Any visitor can
   act on any session id (1.11) — read, cancel, or retry it — because
   nothing ties a session to whoever started it.
3. **Guessable session ids compound (2).** A sequential counter makes
   enumeration trivial for an attacker who has seen even one real id
   (e.g. via a shared link, a screenshot, or their own prior session).
4. **No database-level backstop.** Even a future application-layer bug
   in `listProjects()`'s filtering would be fully exploitable, because
   no RLS policy exists to catch it — today, there is only one layer of
   defense (currently absent), not two.
5. **No abuse/rate limiting** (`CLAUDE.md` Section 16, already an open
   item) compounds all of the above — an anonymous, unauthenticated
   caller can also call these routes at unlimited volume today.

None of this is a regression introduced by this design — it is the
accurately-described, pre-existing state this milestone exists to fix.

---

## Part 3 — Target Architecture

### 3.1 Provider choice: Supabase Auth — not NextAuth, not Clerk

**Chosen: Supabase Auth**, via the `@supabase/ssr` package (Supabase's
current, documented package for Next.js App Router cookie-based
sessions — `@supabase/auth-helpers-nextjs` is its deprecated
predecessor and should not be installed instead).

**Why:** Supabase is already this project's only database. Supabase
Auth's users live in the same Postgres instance (`auth.users`), and its
JWTs expose `auth.uid()` directly inside RLS policies — the exact
mechanism needed to enforce `projects.owner_id` scoping at the database
layer (Part 3.7). `CLAUDE.md` Section 8 already anticipated this
provider choice by name: *"Future Auth service (`auth.ts`, Milestone
4)... Routes/Server Components call something like
`getCurrentUser(request)`."*

**Alternatives rejected:**
- **NextAuth.js (Auth.js)** — a strong, popular library, but its own
  user/session model is independent of Supabase's `auth.uid()`. Using
  it would require either (a) a second, separately-synced user-identity
  table just to make RLS meaningful, or (b) abandoning RLS and relying
  on application-layer filtering alone — reintroducing exactly the
  single-point-of-failure risk Part 2 names. Real, unnecessary
  complexity for no corresponding benefit given Supabase is already the
  database.
- **Clerk** — an excellent dedicated identity product, but it is a
  second billed vendor and, like NextAuth, its user ids are foreign to
  Postgres/RLS by default (a sync step would be needed to make
  `auth.uid()`-based policies work at all). Rejected for the same
  structural reason as NextAuth, not a quality judgment.

### 3.2 Two Supabase clients replace the current single one

Today: `lib/supabase.ts` exports one client, built once with the anon
key, used identically from every context. Cookie-based server sessions
require **two different construction contexts**, per Supabase's own
documented App Router pattern:

```
lib/supabase/
  client.ts   — createBrowserClient() — for "use client" components
                 that need a live Supabase client (e.g. a login form
                 calling supabase.auth.signInWithPassword()).
  server.ts   — createServerClient() — for Server Components, Route
                 Handlers, and Server Actions; reads/writes the session
                 cookie via next/headers' cookies().
```

This replaces `lib/supabase.ts` (one file becomes two, under a new
`lib/supabase/` folder) — a real, necessary evolution of `CLAUDE.md`
Section 4's current folder rule (*"`lib/supabase.ts` — exactly one
thing, the shared Supabase client"*), not a violation of it: the rule's
intent (one, centrally-defined client construction, never inlined
elsewhere) is preserved: there are still exactly two sanctioned
construction points, and nothing outside `lib/supabase/` ever calls
`createClient`/`createBrowserClient`/`createServerClient` directly.

### 3.3 Where authentication starts

A new, public route group: `/login` (email/password and/or magic link
— exact methods are a product decision, Part 6). Submitting the form
calls `supabase.auth.signInWithPassword()` (or
`signInWithOtp()` for magic link) via the **browser** client (3.2);
Supabase Auth itself issues the session (JWT + refresh token), and
`@supabase/ssr`'s browser client writes it to cookies automatically. No
custom session-issuing code is written by this app anywhere — Supabase
Auth is the sole issuer.

### 3.4 Session lifecycle

1. **Sign-in** (3.3) — Supabase issues an access token (short-lived JWT)
   and a refresh token, stored in httpOnly cookies by `@supabase/ssr`.
2. **Every subsequent request** — `middleware.ts` (3.5) calls
   `supabase.auth.getUser()` using the **server** client, which
   transparently refreshes the access token from the refresh token if
   it has expired, and re-writes the (possibly updated) cookies onto
   the outgoing response. This is the step that keeps a session alive
   across requests — skipping it is a documented, common Supabase
   integration bug (sessions silently going stale) that this design
   avoids by including it explicitly.
3. **Server-side reads** (Server Components, Route Handlers) —
   `getCurrentUser()` (3.6) calls `.auth.getUser()` again against the
   server client — **never** `.auth.getSession()` for an authorization
   decision, since `getSession()`'s user data is read from the JWT
   itself without revalidating it against Supabase Auth, and is
   therefore not safe to trust for a decision that grants/denies
   access. `getUser()` performs that revalidation and is the only call
   this design permits for authorization purposes.
4. **Sign-out** — a Server Action or route calling
   `supabase.auth.signOut()` via the server client, clearing the
   session cookie.

### 3.5 Middleware responsibilities

`middleware.ts` (new, repo root) has exactly two jobs:

1. **Refresh the session cookie** on every request (3.4, step 2) — this
   runs for every route, including public ones, since it's a mechanical
   cookie-freshness requirement, not an authorization decision.
2. **Redirect unauthenticated *page* navigations away from protected
   routes** to `/login`, and redirect an already-authenticated visitor
   away from `/login`/`/signup` to `/dashboard`.

**Deliberately does NOT gate API routes with a redirect.** Considered
directly and rejected: a redirect response returned to a `fetch()`-based
API caller (which is what every one of this app's own routes receives —
`lib/http/apiClient.ts`'s `postJSON`/`getJSON`) is not actionable the
way it is for a browser navigation; the caller would see a confusing
3xx with an HTML body, not a clean error. Instead, each API route
performs its own `getCurrentUser()` check and returns a proper JSON 401
via the existing `jsonError()` helper — this is not a new pattern, it's
the exact same "route validates before calling a service"
convention (`CLAUDE.md` Section 13) already used for request-body
validation, with one more check added in the same place.

### 3.6 Server-side authorization: `lib/services/auth.ts`

```ts
export async function getCurrentUser(): Promise<AuthUser | null>
```

The one new service, sitting on top of `lib/supabase/server.ts`,
exactly matching the shape `CLAUDE.md` Section 8 already named:
*"Routes/Server Components call something like `getCurrentUser(request)`
— they don't parse cookies or verify tokens themselves."* Every route
and Server Component that needs the current visitor's identity calls
this one function — never `next/headers`, never Supabase Auth, never a
cookie, directly.

**A deliberate, named exception to "services are framework-agnostic"
(`CLAUDE.md` Section 8):** `lib/services/auth.ts` necessarily touches
`next/headers` (via the server Supabase client), because *something*
server-side has to read the request's cookies, and `CLAUDE.md`'s own
existing text already anticipates this exact file as the one place
that's allowed to. Every other service remains untouched by this
exception.

Protected routes/Server Components call `getCurrentUser()` first; if
`null`, they throw a new `UnauthorizedError` (401) — added to
`lib/errors/AppError.ts` alongside the existing
`ValidationError`/`ExternalServiceError`/`InvalidRequestError`, never a
bare thrown string.

### 3.7 Ownership validation & Project authorization

Two enforcement layers, deliberately not one:

**Layer 1 — Application layer (required, not optional).** The
authenticated `userId` from `getCurrentUser()` is threaded explicitly
through every function that touches a session or a project — never
re-derived deep inside a framework-agnostic service:

```
Route (app/api/analysis-sessions/route.ts)
  → getCurrentUser() → userId (401 if null)
  → startAnalysisSession(input, userId)
      → createSession(...) unchanged
      → toView() → persistProjectFromSession(view, userId)
                       → Project.ownerId = userId (was always null)

Route (app/api/analysis-sessions/[id]/route.ts, .../cancel, .../retry)
  → getCurrentUser() → userId (401 if null)
  → getAnalysisSession(id, userId) / cancelAnalysisSession(id, userId) / ...
      → loads the session record; if its own persisted Project's
        ownerId (once one exists) doesn't match userId, throws a new
        ForbiddenError (403) — a visitor cannot act on someone else's
        session merely by knowing/guessing its id (closes 1.11's gap
        directly)

lib/services/projects.ts
  → listProjects(userId: string): Promise<Project[]>
      → .eq("owner_id", userId) — no longer returns every row
```

**Layer 2 — Database layer (RLS, defense-in-depth, not a
replacement for Layer 1).** A future migration enables RLS on
`projects` and adds a policy scoping every `select`/`insert` to
`auth.uid() = owner_id`. This directly resolves `CLAUDE.md` Section
16's long-open, explicitly-flagged concern. Layer 1 must not be skipped
just because Layer 2 exists — `CLAUDE.md`'s own validation philosophy
(Section 14: "always validate, even your own") argues for exactly this
belt-and-suspenders approach, not picking one layer over the other.

A single, named authorization function —
`authorizeProjectAccess(project, userId): boolean` — is introduced
rather than inlining `project.ownerId === userId` at every call site,
specifically so a future team/workspace model (3.9) only ever needs
this one function's internals changed.

### 3.8 Client responsibilities

- A client Supabase instance (3.2's `lib/supabase/client.ts`) is used
  **only** for: the login/signup form's own `signInWithPassword`/
  `signInWithOtp` calls, a sign-out button's `signOut()` call, and
  (optionally) `onAuthStateChange` for live UI reactivity (e.g.
  `ProfileMenu` updating without a full reload after sign-out).
- **Every actual data operation continues to go through this app's own
  API routes/Server Components**, exactly as today — a client never
  reads `DecisionProfile`/`Project` data directly from Supabase, and
  never supplies its own "who am I" claim for an authorization decision
  (a client-sent user id would be trivially spoofable — the server
  always re-derives identity itself via `getCurrentUser()`, never
  trusts a request body/header for it).
- `lib/http/apiClient.ts` requires **no changes** — `fetch()` already
  sends same-origin cookies by default, so the session cookie
  `middleware.ts` maintains is automatically included in every existing
  `postJSON`/`getJSON` call once a user is signed in.

### 3.9 Future team/workspace compatibility

Not built now (explicit non-goal, Part 7), but not foreclosed:
`authorizeProjectAccess()` (3.7) is the one seam a future
workspace/team model would change — e.g. from "does `userId` equal
`project.ownerId`" to "is `userId` a member of `project.workspaceId`'s
team" — without touching any of the call sites that already invoke it.
`ownerId` itself stays a single user id for this milestone; a future
`workspaceId` would be a new, additive, nullable column (matching
`CLAUDE.md` Section 22's "additive evolution" rule), not a
redefinition of `ownerId`.

### 3.10 Protected vs. public routes

| Route | Access |
|---|---|
| `/` (landing) | Public |
| `/pricing` | Public |
| `/login`, `/signup` | Public (redirects away *from* these if already authenticated) |
| `/dashboard`, `/dashboard/analysis` | **Protected** |
| `/projects` | **Protected** |
| `/competitors`, `/research`, `/reports`, `/templates`, `/settings` | **Protected** (currently stub pages, but stubs still shouldn't leak a signed-in-only nav item to anonymous visitors) |
| `POST /api/analysis-sessions`, `GET/POST /api/analysis-sessions/[id]*` | **Protected** — 401 JSON, not a redirect (3.5) |

### 3.11 Anonymous/guest analysis — an open product question, not a silent default

Today, anyone can run a full analysis with zero friction. This design
does **not** unilaterally decide whether that must end. Two real
options exist:

- **Hard cutover:** analysis requires sign-in from day one of this
  milestone shipping.
- **Soft cutover:** an anonymous visitor can still run one analysis
  (not persisted, or persisted with `ownerId = null` and a
  time-boxed/session-only visibility), with sign-in required to save it
  or see history — a common "try before you sign up" pattern.

Flagged explicitly for product sign-off (Part 6), not decided here —
this is a product posture question, not a purely architectural one.

---

## Part 4 — Text Flow Diagrams

### 4.1 Sign-in

```
Visitor → /login (public)
  → submits email/password (or requests a magic link)
  → browser Supabase client calls auth.signInWithPassword()/signInWithOtp()
  → Supabase Auth validates, issues access+refresh tokens
  → @supabase/ssr writes session cookies (browser-side)
  → client redirects to /dashboard
  → middleware.ts sees a valid session on the next request → no redirect
```

### 4.2 An authenticated request to a protected page

```
Browser GET /dashboard
  → middleware.ts: supabase.auth.getUser() via server client
      → valid session → cookie refreshed if needed → request proceeds
  → app/dashboard/page.tsx (Server Component)
      → getCurrentUser() → AuthUser
      → listProjects(user.id) → only this user's Projects
      → renders DashboardHome
```

### 4.3 An unauthenticated request to a protected page

```
Browser GET /dashboard (no session cookie)
  → middleware.ts: getUser() → null
      → redirect → /login
  → page component never runs
```

### 4.4 An authenticated request to a protected API route

```
Client POST /api/analysis-sessions { startupIdea }
  → route handler: getCurrentUser() → AuthUser (or 401 jsonError if null)
  → startAnalysisSession(input, user.id)
      → createSession(...) — unchanged, still knows nothing about users
      → toView() → persistProjectFromSession(view, user.id)
          → Project.ownerId = user.id
  → jsonSuccess(view)
```

### 4.5 One visitor attempting another visitor's session id

```
Visitor B GET /api/analysis-sessions/session_XXXX (belongs to Visitor A)
  → route handler: getCurrentUser() → Visitor B's AuthUser (B is logged in)
  → getAnalysisSession(id, userB.id)
      → loads session; its persisted Project.ownerId === userA.id ≠ userB.id
      → throws ForbiddenError (403)
  → jsonError → { error: "..." } , 403
```

### 4.6 Sign-out

```
Visitor clicks "Sign out" (ProfileMenu, real action added this milestone)
  → browser client: supabase.auth.signOut()
  → session cookie cleared
  → redirect → /
```

---

## Part 5 — File-by-File Impact

**New files:**

| File | Purpose |
|---|---|
| `middleware.ts` | Session refresh (all routes) + page-route redirects (3.5) |
| `lib/supabase/client.ts` | Browser Supabase client factory |
| `lib/supabase/server.ts` | Server Supabase client factory (cookie-aware) |
| `lib/services/auth.ts` | `getCurrentUser()` — the one seam every route/Server Component uses |
| `app/login/page.tsx` | Sign-in UI (public) |
| `app/signup/page.tsx` | Sign-up UI (public) — or folded into `/login` as one form with a mode toggle, a UI decision for Part 6 |
| A sign-out Server Action (location TBD in Part 6 — likely colocated with `ProfileMenu.tsx` or a small `app/auth/actions.ts`) | Clears the session |
| A future RLS migration (`supabase/migrations/`) | `enable row level security` + `create policy` on `projects` (3.7, Layer 2) |

**Modified files:**

| File | Change |
|---|---|
| `lib/supabase.ts` | Retired, replaced by `lib/supabase/client.ts` + `lib/supabase/server.ts` (3.2) |
| `lib/errors/AppError.ts` | Add `UnauthorizedError` (401), `ForbiddenError` (403) |
| `lib/services/projects.ts` | `listProjects(userId)`, `persistProjectFromSession(view, userId)` — both gain a required `userId` parameter; insert now sets a real `owner_id` |
| `lib/services/analysisSessions.ts` | Every exported function gains a `userId` parameter, threaded to `persistProjectFromSession` and to a new ownership check on read/cancel/retry |
| `app/api/analysis-sessions/route.ts` and its three `[id]/...` siblings | Each calls `getCurrentUser()` first; 401 if absent; passes `user.id` into the service call |
| `app/dashboard/page.tsx`, `app/dashboard/analysis/page.tsx`, `app/projects/page.tsx` | Each calls `getCurrentUser()` (or relies on middleware + a shared layout check) before calling `listProjects(user.id)` |
| `app/dashboard/layout.tsx` | Gains the actual protected-route boundary (or this is fully delegated to `middleware.ts` — a design choice for Part 6) |
| `components/dashboard/shell/ProfileMenu.tsx` | Real user name/email (from `getCurrentUser()`, threaded down as a prop) replaces "Yasin"; a real, working "Sign out" action replaces the current, honestly-omitted placeholder |
| `components/dashboard/home/DashboardWelcome.tsx` | Real first name/email replaces "Yasin" |
| `CLAUDE.md` | Section 4 (Folder Rules) gains `lib/supabase/`, `app/login`; Section 8 gains the real `auth.ts` entry (currently written as a future-tense placeholder); Section 16 gains "RLS is now defined and enforced," replacing the long-standing open item |

**Unaffected (explicitly, so a reviewer doesn't wonder):** `lib/analysis-session/`, `lib/pipeline/`, all six knowledge platforms, `DecisionReport` and its six child components, `lib/schemas/project.ts` (its shape doesn't change — `ownerId` was already reserved for exactly this).

---

## Part 6 — Implementation Plan (Milestones)

Authentication is large enough to deserve its own sub-sequence, not one
milestone:

**Milestone 27a — Supabase Auth wiring (no protection yet).**
Install `@supabase/ssr`; add `lib/supabase/client.ts` +
`lib/supabase/server.ts`; add `middleware.ts` (session-refresh
responsibility only, no redirects yet); add `lib/services/auth.ts`
(`getCurrentUser()`); add `/login`/`/signup` pages and a working
sign-in/sign-up/sign-out flow. **Verifiable outcome:** a user can create
an account, log in, and `getCurrentUser()` correctly returns them
server-side — with zero change yet to any existing route's behavior.

**Milestone 27b — Route protection.**
`middleware.ts` gains redirect responsibility for protected pages
(3.5/3.10); every API route adds its own `getCurrentUser()` check and
401s without one. **Verifiable outcome:** an unauthenticated visitor is
redirected away from `/dashboard`/`/projects`/etc., and API calls
without a session return 401 — the Part 6 "anonymous flow" product
decision (3.11) must be made before this milestone starts, since it
determines whether analysis itself is gated here.

**Milestone 27c — Ownership enforcement.**
`listProjects(userId)`, `persistProjectFromSession(view, userId)`,
`authorizeProjectAccess()`, `ForbiddenError` on cross-user
session/project access; the RLS migration (Layer 2) is written and
applied. **Verifiable outcome:** two different accounts each see only
their own projects, in the UI and at the database layer independently
(confirmed via the same kind of live, end-to-end verification Milestone
26 used — no reliance on application code alone).

**Milestone 27d — Real identity in the UI.**
`ProfileMenu`/`DashboardWelcome` show the real signed-in user; a working
sign-out action ships. **Verifiable outcome:** the last two
honestly-labeled placeholders in the codebase are replaced with real
data, not because they were wrong before, but because it's now possible
to be right.

Each sub-milestone should get its own short design note (matching this
project's own established one-document-per-unit-of-work discipline) at
implementation time, rather than being designed exhaustively here in
advance of 27a's own findings.

---

## Part 7 — Explicit Non-Goals for This Milestone

- **No OAuth providers** (Google/GitHub sign-in) — email/password
  and/or magic link only, unless Part 6's product sign-off adds this
  explicitly. Not precluded architecturally (Supabase Auth supports it
  natively), just not in scope now.
- **No teams/workspaces** — `ownerId` stays a single user id (3.9).
- **No account settings/profile editing UI** beyond what's needed to
  sign in/out — `/settings` remains a stub for now, a separate,
  already-tracked item (`ATLAS_AI_PHASE_3_REVIEW.md` Theme B).
- **No password-reset UI beyond Supabase Auth's own default flow** — no
  custom email templates/branding pass in this milestone.
- **No admin roles or permission tiers** — every authenticated user has
  identical capability (their own projects only); no "admin sees
  everyone's projects" concept is introduced.
- **No billing/plan-tier integration** — a separate, later Roadmap
  Milestone (5), explicitly sequenced after Authentication in the
  original roadmap, unchanged by this design.
- **No rate limiting** — a real, separate, already-named gap
  (`CLAUDE.md` Section 16), not bundled into this milestone even though
  it's thematically related.
- **No migration of the 16 pre-existing legacy `Project` rows'
  ownership** — those rows have `owner_id = null` today and will
  continue to; assigning them to a real user retroactively is a
  separate, explicit product decision (the same one Milestone 26's
  Migration B already awaits), not something Authentication resolves as
  a side effect.

---

## Part 8 — Risks

- **Session-refresh omission is a known, common integration bug.**
  Skipping the `middleware.ts` cookie-refresh step (3.4/3.5) is the
  single most common way Supabase SSR integrations silently break
  (sessions appearing to log a user out early). Mitigated by making it
  an explicit, named, first-class responsibility of 27a rather than an
  afterthought.
- **`getSession()` vs. `getUser()` confusion.** Using the former for an
  authorization decision is a real, easy-to-make mistake (it trusts the
  JWT's claims without revalidating them). This design names the
  distinction explicitly (3.4) precisely to prevent it at
  implementation time.
- **RLS policy bugs are silent by nature.** A too-permissive policy
  (or none) fails open, not closed — exactly today's current state.
  Mitigated by treating RLS as mandatory, verified defense-in-depth
  (3.7, Layer 2), not an optional hardening pass, and by planning
  explicit, live, two-account verification (27c) rather than trusting
  the policy's SQL alone.
- **A new dependency (`@supabase/ssr`).** `CLAUDE.md` Section 17 treats
  dependency changes as worth flagging explicitly, not silently
  bundling — surfaced here for the same reason.
- **Ordering risk with Milestone 26.** Project persistence already
  shipped with `ownerId` always `null`; every `Project` created between
  Milestone 26 and this milestone's Layer 1 landing has no real owner.
  This is expected and named, not a defect — those rows simply remain
  globally visible (today's existing behavior) until Milestone 27c's
  RLS lands, at which point they become invisible to every user (having
  no matching `owner_id`) unless explicitly reassigned — a real,
  visible product change worth the team's awareness at cutover time,
  not a silent side effect discovered later.
- **The anonymous-flow product decision (3.11) blocking 27b.** If left
  undecided, 27b cannot be scoped precisely — flagged as a hard
  dependency, not a nice-to-have to resolve later.
- **Breaking the "services are framework-agnostic" rule's spirit**, even
  though `lib/services/auth.ts`'s exception is pre-anticipated
  (`CLAUDE.md` Section 8) — risk is a future engineer copying this
  file's pattern into an unrelated service that shouldn't touch
  `next/headers`. Mitigated by this document naming the exception
  explicitly as unique to this one file, and by a `CLAUDE.md` Section 8
  update (Part 5) stating the same.

---

## Part 9 — Definition of Done (for this design phase only)

1. This document accurately reflects the current codebase's total
   absence of authentication (Part 1) — independently verifiable via
   the exact grep/read commands cited, not assumed.
2. A named provider decision (Supabase Auth, Part 3.1) with alternatives
   explicitly considered and rejected, reasons stated.
3. Every architectural question the task posed (Part 3) is answered
   with a concrete mechanism, not a placeholder.
4. Every recommendation states why it's needed, what alternative was
   rejected and why, its impact on the current architecture, and its
   risk (Parts 3, 8) — not asserted without justification.
5. A milestone-by-milestone implementation plan exists (Part 6), with
   one open product question (3.11) explicitly flagged as a
   precondition rather than silently resolved.
6. Explicit non-goals are named (Part 7) so a future implementer (human
   or AI) doesn't scope-creep this into teams, billing, or admin roles.
7. **No code, dependency, migration, or configuration file was created
   or modified in the production of this document.**
8. **No commit, no push** — this document alone is the deliverable.

---

*End of design specification. Awaiting review before Milestone 27a
begins.*
