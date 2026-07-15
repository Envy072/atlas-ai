# Atlas AI — Milestone 30 Design Specification

**Testing & Continuous Integration**

Status: **Design only. No code, no folders, no source files modified.
No dependencies installed. No commits.**

---

# 1. Goal

**Purpose.** Build Atlas AI's first automated quality-verification
layer: a unit/integration test suite plus a CI pipeline that runs it
(alongside the type-check and lint that already exist) on every push
and pull request. Today, "the code is correct" is established entirely
by a human (or AI) manually running `tsc`/`eslint`/`next build` and
reasoning through a golden path once, per milestone, per Section 20 of
this project's own handbook. That discipline has held for 29
milestones — but it protects the milestone being written, not the 28
before it. Nothing currently re-verifies that Milestone 12's pipeline
engine, Milestone 16's competitor resolver, or Milestone 26's
persistence logic still behave correctly after Milestone 30 (or 40, or
80) changes a shared dependency.

**Why now.** This is not a subjective call — it's already the
project's own, twice-independently-recorded conclusion:

- `CLAUDE.md` Section 21, Roadmap Milestone 7 (**"Testing &
  CI/CD"**, unchanged since before this project's Milestone 1): *"Unit
  tests for services (most valuable to test — framework-agnostic,
  easiest to mock), integration tests for API routes, end-to-end tests
  for the golden path. A CI pipeline blocking merges on failure..."*
- `ATLAS_AI_PHASE_3_REVIEW.md`'s Final Assessment (§7, read directly
  this session): *"**Engineering maturity score: 5/10.** Design rigor
  and verification discipline are excellent within each milestone;
  **zero automated tests and zero CI mean none of that rigor is
  protected against regression going forward — the single largest gap**
  between 'how carefully this was built' and 'how safely it can keep
  being changed.'"*

Both documents name this exact gap, independently, before this design
was written. Milestone 30 exists to close it.

**Why this is the correct sequencing after Milestones 26–29.**
Milestones 26–29 completed Authentication, real persistence (`Project`
rows, RLS ownership), and closed every remaining visible product gap
(Theme B). Per `ATLAS_AI_PHASE_3_REVIEW.md`'s own Phase 3 Roadmap,
Theme D (Startup Builder — the product's stated north star) is
explicitly gated behind Authentication and persistence, both now done,
and is named as "deliberately last" because it's the single largest,
riskiest piece of remaining product work. Adding that scope *now*,
directly on top of a codebase with zero regression protection, means
every future change to `lib/decision`, `lib/pipeline`, or
`lib/services/projects.ts` — all of which Startup Builder would touch
— carries unverified risk of silently breaking Milestones 12–29. This
is the same reasoning `ENGINEERING_BACKLOG_SHARED_UTILITIES.md` (its
own Milestone 20) already applied to a smaller debt: pay it down at the
exact point before the next, larger wave of work would compound it.
Testing & CI is infrastructure investment, not a capability — like that
milestone, it changes nothing a founder using Atlas AI observes
directly, but it changes how safely every future milestone (starting
with Startup Builder) can be built.

**Fit with long-term architecture.** `CLAUDE.md` Section 22 states the
services layer is "the stable contract" and schemas evolve
additively — both claims a test suite can now actually enforce rather
than assert. This milestone doesn't change that architecture; it makes
it verifiable. The services/schema/store layering already in place
(every knowledge platform's `createStore()` defaulting to an in-memory
backend, confirmed by direct audit below) turns out to have been
accidentally test-friendly from the start — this milestone is the
first to actually exploit that.

---

# 2. Scope

### Included

- Vitest as the test runner (unit + integration), with coverage
  reporting via `@vitest/coverage-v8`.
- A test folder/naming convention, formally documented in `CLAUDE.md`.
- Shared test fixtures (schema-valid synthetic `Project`/
  `AnalysisSession`/`DecisionProfile`-shaped data) and a shared,
  hand-rolled Supabase client mock.
- A concrete, representative first batch of unit tests covering the
  cross-cutting utilities every layer depends on, the services layer
  (with the Supabase client mocked), and one knowledge platform's pure
  scoring/confidence logic as the template for testing the other five.
- A concrete integration test covering the create and get-by-id
  requests of the one existing API route family
  (`/api/analysis-sessions`) end-to-end against the real,
  already-in-memory session store — no mocking needed there, since
  memory is already this system's default backend. The `cancel`/
  `retry` siblings are not separately tested this milestone (Section
  3, Deliverable 8) — they compose through the exact same `toView()`
  function the tested routes already exercise (`lib/services/
  analysisSessions.ts`, confirmed by direct read, Section 5), so this
  is a named, understood gap, not an untested unknown.
- A GitHub Actions CI workflow that runs lint, type-check, tests (with
  coverage reported, not gated), and a production build on every push
  and pull request targeting `main`.
- `package.json` `test`/`test:watch`/`test:coverage` scripts, and an
  `engines.node` field pinning the minimum Node version (currently
  undeclared — an audit finding, Section 5).
- A short `TESTING.md` (or a new `CLAUDE.md` subsection — decided in
  Architecture, Section 7) documenting how to write and run a test in
  this codebase.

### Excluded (see Non-Goals, Section 4, for the full list with reasoning)

- End-to-end/browser tests (Playwright or similar).
- React component-level tests (Testing Library/jsdom).
- Exhaustive unit-test coverage of all six knowledge platforms — one
  platform's pure logic is covered as the proven template; the other
  five are named as a future, mechanical follow-up (Section 16).
- Any change to product behavior, schemas, or the database.
- A CI-enforced minimum coverage percentage (coverage is reported, not
  gated, this milestone — see Risks, Section 12).

**Feature-creep guard:** every deliverable below is either (a) a piece
of infrastructure (runner, config, CI, docs) or (b) a test file whose
sole effect is *observing* existing, unmodified behavior. Nothing in
this milestone changes what Atlas AI does for a user.

---

# 3. Deliverables

1. **`vitest.config.ts`** — Vitest configuration: `node` test
   environment (no `jsdom` — no component tests this milestone), a
   manual `resolve.alias` entry mapping `@` to the project root
   (matching `tsconfig.json`'s own `"@/*": ["./*"]` exactly — one
   static alias is simpler to hand-declare than to add a plugin
   dependency for, per `CLAUDE.md`'s own "avoid unnecessary
   dependencies" principle; revisit only if `tsconfig.json` ever grows
   a second, non-trivial alias), `@vitest/coverage-v8` wired as the
   coverage provider, and an explicit `allowOnly: !process.env.CI` —
   Vitest's own option (its default is already `!process.env.CI`,
   confirmed by direct read of its shipped types; set explicitly here
   so the guarantee is visible in the config, not an implicit default
   a future reader has to look up) — fails the run in CI if any
   committed `test.only`/`it.only`/`describe.only` would otherwise
   silently skip the rest of the suite while still exiting 0 locally.
2. **New devDependencies**: `vitest`, `@vitest/coverage-v8`. Nothing
   else — no path-alias plugin (resolved manually, Deliverable 1) and
   no component-testing dependency (`@testing-library/react`,
   `jsdom`) is added, since that's explicitly out of scope.
3. **`package.json` changes**: `"test": "vitest run"`,
   `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`
   scripts; `"engines": { "node": ">=20.9.0" }` (Next.js 16's own
   declared minimum, confirmed by direct read of
   `node_modules/next/package.json`, Section 5).
4. **`tests/fixtures/`** — schema-valid synthetic fixture builders:
   `buildProjectFixture()`, `buildDecisionProfileFixture()`,
   `buildVerificationSummaryFixture()`. Each returns data that passes
   its real Zod schema (`ProjectSchema`, `DecisionProfileSchema`,
   `VerificationSummarySchema`) — proven by the fixtures' own smoke
   test (Deliverable 8).
5. **`tests/mocks/supabaseClient.ts`** — a small, hand-rolled mock
   implementing only the exact Supabase client call *chains*
   `lib/services/projects.ts` and `lib/services/auth.ts` actually use
   — precisely, not approximately: `auth.getUser()`;
   `from().select().eq("owner_id", userId).order()` (`listProjects`,
   one filter); `from().select().eq("id", id).eq("owner_id",
   userId).maybeSingle()` (`getProjectById` — two chained `.eq()`
   calls, a distinct shape from `listProjects`'s call, and the mock
   must support both); `from().insert()`
   (`persistProjectFromSession`) — not a general-purpose Supabase mock
   library, which this codebase's usage doesn't need and would be
   premature abstraction for a surface this small and stable.
6. **Unit tests, pure functions (co-located `*.test.ts`)**:
   - `lib/format.test.ts` — every exported function in `lib/format.ts`
     (`formatScore`, `formatDisplayName`, `getSafeRedirectPath`,
     `formatPercent`, `formatCurrencyUsd`, `formatRelativeTime`),
     including `getSafeRedirectPath`'s three documented attack-vector
     rejections (`//`, `/\`, `://`) — a security-relevant function
     that has never been automatically re-verified since Milestone 28
     introduced it.
   - `lib/validation/parse.test.ts` — `parseOrThrow`'s pass-through and
     `ValidationError`-throwing branches.
   - `lib/errors/AppError.test.ts` — every subclass's `status`/`code`,
     `getErrorMessage`, `getErrorStatus`.
   - `lib/api/response.test.ts` — `jsonSuccess`'s status/body,
     `jsonError`'s `AppError`-vs-unexpected-error branching.
   - `lib/decision/confidence/decisionConfidence.test.ts` — the
     representative knowledge-platform test: full/partial/empty
     checklist coverage, empty-evidence-yields-zero (not fabricated),
     empty-sources-yields-`undefined`-freshness (not a false "0 days
     old"), using a fixed reference `Date` (via
     `vi.setSystemTime`) so the freshness assertion is deterministic,
     never flaky.
7. **Unit tests, mocked external dependency (co-located `*.test.ts`)**:
   - `lib/services/projects.test.ts` — using Deliverable 5's mock:
     `listProjects` scopes by `owner_id` and returns `[]` (not a throw)
     on a Supabase error or a malformed row; `getProjectById` returns
     `null` uniformly for "not found," "wrong owner," and "malformed
     row" (the exact enumeration-resistance guarantee
     `MILESTONE_29_DESIGN.md` Section 9 relies on — now actually
     verified, not just reasoned about); `persistProjectFromSession`
     is a no-op for a non-completed session or a null `userId`, and
     treats a `23505` unique-violation error as a silent success, not a
     logged failure.
   - `lib/services/auth.test.ts` — `getCurrentUser` returns `null` when
     Supabase has no user, and the mapped `AuthUser` shape when it does.
8. **Integration test**: `tests/integration/analysis-sessions.test.ts`
   — calls the real exported route handlers
   (`app/api/analysis-sessions/route.ts`'s `POST`,
   `app/api/analysis-sessions/[id]/route.ts`'s `GET`) directly with
   constructed `Request` objects, against the real (already in-memory
   by default, confirmed Section 5) session store — no network, no
   mocking. Covers: create → immediately readable by id (golden path);
   an empty `startupIdea` → `400` with `InvalidRequestError`'s message;
   a nonexistent session id → the same not-found handling
   `app/api/analysis-sessions/[id]/route.ts` already implements.
9. **`.github/workflows/ci.yml`** — top-level `permissions: contents:
   read` (least-privilege default — this pipeline only reads the repo
   and reports a check status, it never needs write access). A single
   job, triggered on `pull_request` and `push` to `main`: checkout →
   `actions/setup-node` pinned to Node 22.x (the Active LTS at time of
   writing, comfortably above Next.js's own declared `>=20.9.0` floor,
   Section 5) with npm caching → `npm ci` → `npm run lint` → `npx tsc
   --noEmit` → `npm run test:coverage` (fails on any `.only`, per
   Deliverable 1's `allowOnly: !process.env.CI`) → `npm run build` (supplied
   placeholder, obviously-non-functional env values, e.g.
   `NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.invalid"` — the
   IANA-reserved `.invalid` TLD, RFC 2606, guaranteed to never resolve
   by design, unlike a subdomain of a real, live domain such as
   `supabase.co` — Section 10). Any step failing fails the job.
10. **`CLAUDE.md` updates**: a new Folder Rules entry (Section 4) for
    `tests/` (fixtures/mocks/integration tests) and co-located
    `*.test.ts` files; Roadmap Milestone 7 marked delivered with a
    pointer to this document, mirroring how Milestone 4
    (Authentication) was marked complete across 27a–28.
11. **`TESTING.md`** (new, root-level, alongside `ARCHITECTURE.md`,
    `PIPELINE.md`, etc.) — how to run tests locally, the co-located
    vs. `tests/integration/` convention, how to add a fixture, how to
    extend the Supabase mock, and CI's exact gate list.

Every item above is a concrete file (or a concrete, named change to an
existing file) — nothing here is "improve test coverage" as a vague
goal.

---

# 4. Non-Goals

- **New AI features, prompt changes, or additional OpenAI usage.**
  `lib/services/openai.ts` is not modified and is not unit-tested this
  milestone (mocking the OpenAI SDK client is real, separate work — see
  Section 16, Future Growth).
- **Startup Builder** (Theme D) — entirely unaddressed; this milestone
  is a precondition for building it more safely later, not a step
  inside it.
- **Brave/Tavily provider improvements** or wiring real search-provider
  credentials (Theme C) — untouched; `lib/research/providers/*` is not
  in this milestone's test scope beyond what's incidentally exercised
  through the analysis-session integration test's own honest-empty
  path (no real provider calls happen there either, by construction).
- **Security hardening** (rate limiting, request-size limits, the
  guessable analysis-session-id issue named in `CLAUDE.md` Section 16)
  — untouched; this milestone verifies existing behavior, it doesn't
  add new protective behavior.
- **Billing, collaboration, notifications** — untouched, unrelated.
- **End-to-end/browser tests** (Playwright) — a materially larger,
  differently-shaped investment (browser binaries in CI, visual golden
  paths, slower runs) that `CLAUDE.md`'s own Milestone 7 text lists as
  a distinct bullet from unit/integration tests. Named as the natural
  next phase of this same roadmap item, not bundled in (Section 16).
- **React component tests** (Testing Library) — same reasoning;
  `CLAUDE.md`'s Milestone 7 text names "services," "API routes," and
  "the golden path," not component-level rendering tests. Deferred.
- **Exhaustive testing of all six knowledge platforms.** `lib/decision`
  is covered as the proven template (Deliverable 6); `lib/market`,
  `lib/financial`, `lib/business`, `lib/competitors`, `lib/research`
  remain untested after this milestone — an explicit, named gap
  (Section 12, Section 16), not a silent one.
- **A CI-enforced minimum coverage threshold.** Coverage is measured
  and reported, not gated — see Risks (Section 12) for why an enforced
  number today would be premature.
- **Any product-facing behavior, schema, UI, or route change.** This
  milestone has zero product-visible effect, by design (Section 1).

---

# 5. Current State Audit

Every claim below is from a direct read or command run this session,
not memory.

**No test infrastructure exists.**
- `find . -iname "*.test.ts" -o -iname "*.spec.ts"` (excluding
  `node_modules`) — zero results.
- No `vitest.config.*`, `jest.config.*`, or `playwright.config.*`
  anywhere in the repo.
- `package.json`'s `scripts` block is exactly `{ "dev", "build",
  "start", "lint" }` — no `test` script has ever existed.
- `package.json`'s `devDependencies` contain no test runner, assertion
  library, or mocking library of any kind.

**No CI exists.**
- No `.github/` directory anywhere in the repository.
- No workflow, action, or badge of any kind.
- `CLAUDE.md` Section 17 ("Git Workflow") already documents this
  gap honestly: *"Review process: for solo/AI-assisted work, run `tsc
  --noEmit` and `eslint` before every commit... Once collaborators
  exist, every change lands via pull request with at least one
  reviewer."* — describing a manual process because no automated one
  exists yet.

**Current tooling, confirmed via direct read:**
- **Package manager:** npm (`package-lock.json` present, 423KB; no
  `yarn.lock`/`pnpm-lock.yaml`).
- **TypeScript:** `strict: true`, `moduleResolution: "bundler"`, path
  alias `@/*` → project root (`tsconfig.json`, read in full).
- **ESLint:** flat config (`eslint.config.mjs`) built on
  `eslint-config-next`'s `core-web-vitals` + `typescript` presets — no
  custom rules beyond that.
- **Node:** no `engines` field declared anywhere in `package.json`
  (an audit finding, addressed in Deliverable 3); local dev environment
  reports `v26.4.0`; Next.js 16.2.10 itself declares
  `"engines": { "node": ">=20.9.0" }` (`node_modules/next/package.json`,
  read directly) — the real floor this project must respect in CI.
- **Supabase:** no `supabase/config.toml` — there is no local Supabase
  CLI project set up. The only Supabase-related repo content is
  `supabase/migrations/*.sql` (three files, hand-authored, applied to a
  real hosted project via the Supabase dashboard/CLI outside this
  repo). This confirms integration tests must not assume a local
  Postgres is available — reinforcing the mock-based strategy below
  rather than a "spin up local Supabase" strategy.

**A structural fact this audit surfaced that materially shapes this
design:** every one of the six knowledge platforms
(`lib/business`, `lib/competitors`, `lib/decision`, `lib/financial`,
`lib/market`, `lib/pipeline`) defines a `createStore()` factory
(confirmed by direct read of `lib/market/storage/createStore.ts`,
representative of the pattern repeated in the other five, per each
platform's own `storage/` folder) that **defaults to an in-memory
backend** (`options.backend ?? "memory"`) unless a caller explicitly
requests `"postgres"`/`"supabase"`/`"warehouse"`. No caller in the
current codebase requests anything but the default (grep-confirmed: no
`backend: "supabase"` or similar call site exists in `app/` or
`lib/services/`). In other words: **this system already runs entirely
in-memory today, everywhere except the one real Supabase-backed table
(`projects`, via `lib/services/projects.ts`)**, without this milestone
changing anything. That is a large, pre-existing gift to testability —
the six-platform pipeline can be integration-tested with zero mocking
and zero network calls, because "memory" already *is* its default,
production-today behavior, not a test-only substitution.

**API surface, confirmed by direct listing:** exactly one route
family exists — `app/api/analysis-sessions/route.ts` (POST),
`app/api/analysis-sessions/[id]/route.ts` (GET),
`[id]/cancel/route.ts` (POST), `[id]/retry/route.ts` (POST). This
scopes "integration tests for API routes" (`CLAUDE.md` Milestone 7) to
a single, small, already-fully-understood family — not an open-ended
surface.

**A documentation-drift finding, noted but explicitly not fixed this
milestone (matching this project's own established pattern of naming
stale docs without bundling their fix into an unrelated milestone —
see `ENGINEERING_BACKLOG_SHARED_UTILITIES.md`'s own "Stale
documentation identified" section for precedent):** `CLAUDE.md`
Sections 6 and 8 both still reference a hook named `useAnalyzeStartup`
as the canonical example (*"`useAnalyzeStartup` decides how a
component observes a request..."*). The actual, current hook is
`hooks/useAnalysisSession.ts`, whose own header comment states
*"Replaces `useAnalyzeStartup` for the live flow"* — `useAnalyzeStartup`
was retired at Milestone 25 (confirmed via git log:
`19dd250 Milestone 25: Retire the orphaned legacy analysis flow`).
`CLAUDE.md`'s prose examples were never updated after that retirement.
Not this milestone's concern to fix (it's a naming-example fix, not a
testing gap), but worth recording so a future reader isn't misled into
writing a test for a hook that no longer exists.

**Existing verification precedent to build on, not replace:**
`ENGINEERING_BACKLOG_SHARED_UTILITIES.md`'s own Milestone 20 used "a
temporary scratch script exercising each shared function directly...
deleted before final build" as its verification method — an ad hoc,
throwaway approach, explicitly *not* a persisted, re-runnable test.
This milestone's entire purpose is to replace that pattern (used
throughout this project's history, including in Milestone 29's own
Sub-milestone 29.4 dedup-logic verification, done in this same
conversation) with a permanent, CI-enforced one.

---

# 6. User Flows

### Developer workflow — writing a new test

1. A developer (human or AI) adds or changes a function in, say,
   `lib/format.ts`.
2. They open (or create) the co-located `lib/format.test.ts` and add a
   case using Vitest's `describe`/`it`/`expect` — no new tooling to
   learn beyond what `TESTING.md` documents in one page.
3. `npm run test:watch` re-runs affected tests on save.

### Local testing workflow

1. `npm test` — runs the full suite once (`vitest run`), used before
   every commit, alongside the already-established `tsc --noEmit` and
   `eslint` (`CLAUDE.md` Section 20, "Review" stage) — this milestone
   adds a third command to that existing ritual, not a new ritual.
2. `npm run test:coverage` — same, plus a coverage summary printed to
   the terminal and written to `coverage/` (gitignored).

### CI workflow (pull request)

1. A PR is opened or updated against `main`.
2. GitHub Actions runs the Deliverable 9 workflow: install → lint →
   type-check → test → build, in that order, failing fast on the first
   failing step.
3. The PR shows a single check (`CI`) as pending, then pass/fail.
4. **Failure case:** any step fails → the job fails → the PR is
   blocked from being merged if branch protection requires the check
   (enabling that GitHub repository setting is a one-time, manual,
   post-milestone action by the repository owner — not something this
   design can configure from inside the repo itself, noted in
   Acceptance Criteria).

### CI workflow (direct push to `main`)

1. Same pipeline runs on every push to `main` (not just PRs), so a
   direct push (still permitted per `CLAUDE.md` Section 17's
   solo-founder exception) is verified after the fact even without
   branch protection enabled yet.

### Failure cases, explicitly covered by this design

- **A test fails locally** — `vitest run` exits non-zero with the
  failing assertion's diff printed; the developer fixes the code or
  the test before committing (mirrors the existing `tsc`/`eslint`
  discipline).
- **A test fails only in CI, not locally** — mitigated, not
  eliminated, by CI running the exact same `npm ci` (lockfile-exact
  install) and Node version locally-documented in `TESTING.md`;
  genuinely environment-specific flakiness is a named risk (Section
  12), not something this design claims to fully prevent.
- **The build step fails in CI due to a missing env var** — mitigated
  by Deliverable 9 supplying placeholder values for every variable
  `next build` might touch (Section 10) — a real gap today would be
  "CI can't build at all," which this design closes as a side effect
  of adding the workflow.

---

# 7. Architecture

### Testing architecture

**Vitest, not Jest.** Justification, not a default assumption:
- This project's `tsconfig.json` is already `"module": "esnext"`,
  `"moduleResolution": "bundler"` — a fully ESM/bundler-oriented
  configuration. Vitest (built on Vite) consumes this natively; Jest
  would need `ts-jest` or `babel-jest` plus extra ESM interop
  configuration to match, working against the grain of a config this
  project already committed to.
- Vitest's API (`describe`/`it`/`expect`) is Jest-compatible, so there
  is no unfamiliar syntax to learn.
- Fast, native TypeScript support with no separate compile step, and a
  much lighter dependency footprint than Jest + its transform chain —
  directly serving `CLAUDE.md`'s "avoid unnecessary abstraction/
  dependencies" principle.
- The user's own message named Vitest first among the example
  deliverables — consistent with, not overriding, the technical
  reasoning above.

**Testing philosophy — explicit ordering, not implied.** This design
invests in exactly this order, deliberately: **business logic before
UI** (every deliverable in Section 3 is `lib/`, `hooks/`, or an API
route — zero component tests, Non-Goals); **unit before integration**
(pure functions and mocked-dependency services are covered before the
one integration test — Sub-milestones 30.3–30.5 precede 30.6); **and
integration before end-to-end** (one route-to-store flow is proven
before any browser-level test is even considered — E2E is explicitly
deferred, Non-Goals). Each tier is only worth building once the tier
below it is trustworthy — the same reasoning `CLAUDE.md` Milestone 7's
own ordering ("unit tests... integration tests... end-to-end tests")
already implies, made explicit here rather than left for a reader to
infer.

### Folder layout

```
lib/format.ts
lib/format.test.ts              ← co-located unit test

lib/services/projects.ts
lib/services/projects.test.ts   ← co-located unit test (mocked Supabase)

lib/decision/confidence/decisionConfidence.ts
lib/decision/confidence/decisionConfidence.test.ts

tests/
  fixtures/
    projectFixture.ts
    decisionProfileFixture.ts
    verificationSummaryFixture.ts
    index.ts                    ← public barrel, matching this
                                    project's own "one schema/module,
                                    one public barrel" convention
  mocks/
    supabaseClient.ts
  integration/
    analysis-sessions.test.ts
```

**Why co-located for unit tests, a separate tree for integration
tests.** A unit test's only reader-relevant context is the one file it
tests — co-locating means a developer opens one folder and sees both
halves, and a file rename/move naturally carries its test with it (no
parallel mirror tree to keep in sync, which is exactly the kind of
"two representations that can drift" `CLAUDE.md` warns against
elsewhere, e.g. Section 5's "derive types from schemas, never
hand-duplicate"). An integration test, by contrast, exercises *multiple*
files (a route, a service, a store) with no single natural home among
them — `tests/integration/` names that it's testing a *flow*, not a
file.

### Shared fixtures

`tests/fixtures/` holds small builder functions
(`buildProjectFixture(overrides?)`) returning schema-valid objects,
verified against their real Zod schema inside the fixtures' own smoke
test — so a fixture that silently drifts out of sync with a schema
change fails loudly (in the fixture's own test) rather than producing
confusing failures in every test that imports it. Builders accept a
partial-overrides argument (matching the "builder + overrides" pattern
already familiar from this codebase's own `ProjectSchema.safeParse`
call sites) so a test can construct "a Project with zero
`keyCompetitors`" without repeating the entire fixture shape.

### Mock strategy

**One, small, hand-rolled Supabase mock — not a mocking library.**
`lib/services/projects.ts` and `lib/services/auth.ts` together call
exactly four distinct chains on the Supabase client — `auth.getUser()`;
`from().select().eq().order()` (`listProjects`, one filter);
`from().select().eq().eq().maybeSingle()` (`getProjectById`, two
chained filters — a distinct shape from `listProjects`'s call, and the
mock must support both); `from().insert()`
(`persistProjectFromSession`) — confirmed by direct re-read of both
files this session. A general-purpose Supabase mocking package
would model a client surface (RPC calls, storage, realtime, auth
sign-in flows) this codebase doesn't use at all — the exact
"unnecessary abstraction" `CLAUDE.md`'s engineering philosophy warns
against. `tests/mocks/supabaseClient.ts` implements only those five
methods, typed against `@supabase/supabase-js`'s own types so a
real-client shape change surfaces as a compile error in the mock, not
a silent runtime mismatch.

**No mock needed for `lib/analysis-session`'s store**, by construction
(Section 5's structural finding) — it already defaults to
`MemoryXStore` in production. The integration test uses the real
module, unmodified, exactly as `app/api/analysis-sessions/route.ts`
does today.

**No mock for OpenAI/Brave/Tavily this milestone** — those call sites
aren't exercised by any test in this milestone's scope (Non-Goals).

### Test organization

Three explicit tiers, matching `CLAUDE.md` Milestone 7's own language:
1. **Unit — pure** (`lib/format.test.ts`, etc.): no I/O, no mocks,
   deterministic input → output.
2. **Unit — mocked dependency** (`lib/services/*.test.ts`): the
   function under test is real; the one thing it talks to (Supabase)
   is a controlled substitute.
3. **Integration** (`tests/integration/*.test.ts`): multiple real,
   unmodified modules (route handler → service → store) exercised
   together, no substitutes at all.

### CI architecture

A single GitHub Actions job (not a matrix, not parallel jobs) running
every gate sequentially: install → lint → type-check → test → build.
**Why one sequential job, not split/parallel jobs:** this project's own
Performance Rules (`CLAUDE.md` Section 15) say "measure before
optimizing further... don't add speculative [work] for problems that
haven't been observed." A four-file test suite and a single Next.js
app build in well under the time a matrix/parallel setup's own runner
provisioning overhead would cost. Splitting into parallel jobs is a
sensible future optimization once the suite is large enough that
sequential runtime is itself the bottleneck (named in Section 16) —
not a default to reach for at zero tests.

---

# 8. Data Model

**No database changes.** No new table, column, index, or RLS policy.
No migration file is added under `supabase/migrations/`. This
milestone tests existing persistence code (`lib/services/projects.ts`)
against a mock, not against the real database — the real, hosted
Supabase project is never touched by any test or by CI.

---

# 9. API Contract

**No new or changed API route, request shape, or response shape.**
The one integration test (Deliverable 8) calls the existing
`app/api/analysis-sessions` route handlers exactly as
`hooks/useAnalysisSession.ts` already does today — as a **consumer**
proving the existing contract holds, not as a change to it. If this
milestone's test suite ever required changing a route's behavior to
make it "more testable," that would itself be a signal the design was
wrong; no such change is proposed here, and none was needed to write
Deliverable 8's test.

---

# 10. Security Review

**Secret handling in CI.** No real secret is ever supplied to CI. The
build step needs *some* value for `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `BRAVE_API_KEY`, and
`TAVILY_API_KEY` to exist in the environment (some code paths read
`process.env.X!` with a non-null assertion, which doesn't runtime-check
but signals the variable is expected to be present), but since no test
in this milestone's scope makes a real network call to Supabase,
OpenAI, Brave, or Tavily, CI supplies harmless, non-functional
placeholder strings (e.g. `NEXT_PUBLIC_SUPABASE_URL:
"https://placeholder.invalid"`, using the IANA-reserved `.invalid` TLD
per RFC 2606 rather than a subdomain of a real, live domain) directly
in the workflow file, not as GitHub encrypted secrets — because they
aren't secret; they're inert. **This is a deliberate, meaningful
choice**: it means this milestone introduces zero real credentials
into GitHub's CI infrastructure, which is itself a smaller attack
surface than wiring real ones would be.

**Workflow permissions.** `.github/workflows/ci.yml` declares
`permissions: contents: read` at the top level — this pipeline only
needs to check out code and report a pass/fail status; it never
pushes, comments, or writes anything. Least-privilege by explicit
declaration, not left to whatever a repository's ambient default
happens to be.

**Environment variables.** `.env.local` remains git-ignored, unchanged
(`CLAUDE.md` Section 16, untouched by this milestone). No test reads
`.env.local`; `vitest.config.ts` does not load it.

**Test isolation.** Every unit test with a mocked dependency
(Deliverable 7) never imports `lib/supabase/server.ts` or
`lib/supabase/client.ts` — it substitutes `tests/mocks/supabaseClient.ts`
via Vitest's `vi.mock()`, so no test can accidentally construct a real
Supabase client, even if `.env.local` happens to be present in the
environment the test runs in (a developer's own machine).

**Protection against accidental production access.** Two independent
layers: (1) the mock substitution above means the *code path* to a
real Supabase call is never exercised by a test; (2) even in the
hypothetical case a future test forgot to mock and a real client were
constructed, CI's placeholder URL (`https://placeholder.invalid`) is
**guaranteed** to fail DNS resolution — `.invalid` is reserved by RFC
2606 specifically so it can never resolve, unlike a subdomain of a
real, live domain (which offers no such guarantee) — a fail-closed
default, not fail-open. The integration
test (Deliverable 8) never touches Supabase at all (Section 5's
structural finding: the session store is in-memory), so this concern
doesn't apply to it.

**No new abuse surface.** This milestone adds no new route, no new
publicly-reachable code — the CI workflow only runs on `pull_request`/
`push` events scoped to this repository, not on external forks by
default (GitHub Actions' own default behavior for `pull_request`
triggers already withholds repository secrets from fork-originated
PRs — moot here anyway, since no real secrets are used at all).

---

# 11. Performance Review

**CI execution time (measured directly during Sub-milestone 30.7, not
estimated):** this session's `next build` runs complete in ~2.5–3s
compile + ~150ms static generation on this machine.
`npm run test:coverage` for the full, real 9-file suite measured
~14–15s locally (see "Test runtime" below for why) — a fresh CI runner
with a cold `npm ci` (no local `node_modules` cache yet) and no
Turbopack warm cache will add more on top. Reasoned estimate for a
first run: `npm ci` ~30–45s, `eslint` ~10–15s, `tsc --noEmit` ~15–25s,
`npm run test:coverage` ~15–25s (measured, not the original ~2–5s
estimate — corrected below), `next build` ~30–60s. **Total: roughly
2–3 minutes per CI run**, with `actions/setup-node`'s built-in npm
cache reducing the `npm ci` portion on subsequent runs.

**Test runtime — corrected during implementation, not the original
estimate.** Most tests in this milestone's scope are a pure function
call or a mocked-dependency call and run in low single-digit
milliseconds. The one exception, measured directly: `tests/
integration/analysis-sessions.test.ts` runs the real, unmodified
six-stage pipeline (`lib/pipeline` through `lib/decision`)
synchronously and without mocking (Sub-milestone 30.6) — ~500ms
uninstrumented, but v8 coverage instrumentation across that much code
slows it to as much as ~14s when the full suite runs under
`--coverage`, occasionally exceeding Vitest's default 5000ms
per-test timeout. Fixed by setting an explicit, generous
`testTimeout: 30_000` in `vitest.config.ts` (Sub-milestone 30.7) —
costs nothing for every other, much faster test, and removes a real,
observed source of CI flakiness rather than leaving a borderline
default in place.

**Scalability.** Vitest runs test files in parallel worker threads by
default — no configuration needed for this milestone's ~9 files to
scale to dozens without a runtime cliff. The one deliberate
non-optimization (Section 7's CI architecture note) is keeping CI as a
single sequential job rather than splitting steps into parallel GitHub
Actions jobs; that split becomes worth its own runner-provisioning
overhead once the suite is large enough for sequential test time alone
to matter, which ~9 files is not.

**Parallelization opportunities not taken, and why.** Splitting
lint/type-check/test into three parallel CI jobs would shave perhaps
30–60 seconds off wall-clock time at the cost of 3x the runner
minutes and meaningfully more workflow-file complexity. Per `CLAUDE.md`
Section 15 ("measure before optimizing further"), this is deferred
until the sequential pipeline is actually observed to be a bottleneck.

---

# 12. Risks

- **Flaky tests.** Time-dependent logic (`decisionConfidence`'s
  data-freshness calculation, `formatRelativeTime`) is mitigated by
  using Vitest's fake-timer APIs (`vi.setSystemTime`) everywhere a
  test's assertion would otherwise depend on wall-clock time. No test
  in this milestone makes a real network call (the one integration
  test uses the already-in-memory session store), which removes the
  most common source of CI flakiness entirely. A second, real source
  was found and fixed during implementation (Sub-milestone 30.7), not
  anticipated at design time: v8 coverage instrumentation measurably
  slows the integration test (it runs the real six-stage pipeline),
  occasionally exceeding Vitest's default 5000ms per-test timeout under
  the full suite — fixed with an explicit `testTimeout: 30_000` in
  `vitest.config.ts` rather than left as a borderline default that
  would have made CI flaky in exactly the way this section warns
  against.
- **Maintenance cost.** Every new test is a small, real cost to keep
  green as the code it covers changes — mitigated by keeping this
  milestone's scope to a representative, high-leverage slice (Section
  2) rather than exhaustive coverage that would multiply this cost six
  platforms over before the pattern has even proven itself once.
- **Mock drift** (`tests/mocks/supabaseClient.ts` diverging from the
  real `@supabase/supabase-js` client's actual behavior). Mitigated
  three ways: (1) the mock is typed against the real package's own
  types, so a signature change is a compile error, not a silent gap;
  (2) the mock's surface is deliberately minimal (five methods) and
  documented in `TESTING.md` as "extend only when
  `lib/services/*.ts` calls a new method," not spec'd ahead of need;
  (3) this risk is exactly why the mock is hand-rolled and small rather
  than a general-purpose library trying to model a much larger surface
  than this codebase uses — smaller surface, smaller drift risk.
- **CI failures blocking legitimate work.** Mitigated by not gating on
  a coverage threshold (a red CI run should mean "something is actually
  broken," not "coverage dipped by a fraction of a percent") and by
  this design's own Verification Plan (Section 14) requiring the full
  pipeline to be run and confirmed green *before* this milestone is
  considered done — CI should never fail on its own first real run.
- **Rollout risk.** Effectively none: every deliverable is additive
  (new files, new `package.json` scripts/devDependencies, a new
  workflow file, two new documentation edits). Zero existing runtime
  code is modified. The single existing file touched with any
  behavioral stakes is `package.json`, and only via addition (new
  `scripts` keys, new `devDependencies`, a new `engines` field) — no
  existing script or dependency version changes.
- **Rollback strategy.** Revert the milestone's commit. Because no
  product code changes, rollback has zero effect on Atlas AI's runtime
  behavior — it only removes the tests and the CI workflow, returning
  to today's fully-manual verification process.

---

# 13. Acceptance Criteria

1. [ ] `vitest.config.ts` exists; `npx vitest run` executes successfully
   from a clean checkout after `npm ci`.
2. [ ] `npm test`, `npm run test:watch`, `npm run test:coverage` all
   exist in `package.json` and behave as named.
3. [ ] `package.json` declares `"engines": { "node": ">=20.9.0" }`.
4. [ ] Every file named in Deliverables 6–8 exists and passes.
5. [ ] `tests/fixtures/`'s own smoke test confirms every fixture
   builder produces schema-valid output against its real Zod schema.
6. [ ] `lib/services/projects.test.ts` proves `getProjectById`'s
   application-layer behavior precisely, corrected during
   implementation from this criterion's original wording: a
   nonexistent id and a wrong-owner id are **not** independently
   distinguishable through a mock (both collapse to Postgres/RLS
   returning zero rows) — that collapse is itself the enumeration-
   resistance property, not a testing gap to work around, so asserting
   it as "three separate cases" would have been dressing up two
   identical assertions as different ones. What the suite actually
   proves instead, honestly: (a) the query is constructed with **both**
   `.eq("id", ...)` and `.eq("owner_id", ...)` — the real, checkable
   application-layer guarantee; (b) a "no row found" result (covering
   both nonexistent and wrong-owner alike) returns `null`; (c) a row
   that fails schema validation returns `null` via a distinct code path
   (logged); (d) a genuine Supabase error returns `null` (logged); (e)
   a valid, owned row returns the correctly-mapped `Project`. Together
   these close the **application-layer** half of the gap
   `MILESTONE_29_DESIGN.md` Section 13's own Acceptance Criterion 4
   left open. The **database-layer** half (RLS actually denying a
   second, real, differently-owned account against the live Supabase
   project) is a separate, live-environment-only check this mocked
   unit test does not and cannot perform — that half remains exactly
   as open as `MILESTONE_29_DESIGN.md` left it, not silently claimed
   closed.
7. [ ] `tests/integration/analysis-sessions.test.ts` proves: create →
   get returns the same session (golden path); an empty `startupIdea`
   returns `400`; a nonexistent id's `GET` returns the app's documented
   not-found behavior.
8. [ ] `.github/workflows/ci.yml` exists; a real PR opened against this
   branch shows the `CI` check running and passing, observed directly
   (not assumed from the YAML alone).
9. [ ] CI is confirmed to actually fail — not just pass — on each of: a
   lint violation, a type error, a failing test, a committed
   `test.only`/`it.only`/`describe.only`, and a build-breaking error
   (Section 14's failure-testing steps, each performed and reverted).
10. [ ] `npm run test:coverage` produces a coverage report locally
    (terminal summary at minimum); no threshold is enforced or asserted.
11. [ ] `CLAUDE.md` Section 4 (Folder Rules) documents `tests/` and
    co-located `*.test.ts`; Section 21's Milestone 7 entry is marked
    delivered with a pointer to this document.
12. [ ] `TESTING.md` exists and its own instructions are directly
    followed (not just written) to confirm they're accurate — run
    `npm test` following only what the document says, with no
    outside knowledge.
13. [ ] `tsc --noEmit` and `eslint` both pass with zero new errors
    across every new/changed file.
14. [ ] `next build` still succeeds, using CI's placeholder env values
    locally as a check that the build genuinely doesn't require real
    secrets.
15. [ ] Zero product-facing *behavior* changes — one narrow, necessary
    exception to "zero product files touched," found and made during
    Acceptance Criteria verification, not originally planned: `git
    diff --stat` shows `components/landing/Testimonials.tsx` modified
    (`"` → `&quot;`, a zero-visual-effect entity substitution fixing
    the pre-existing `react/no-unescaped-entities` errors this session
    has noted-but-not-fixed since Milestone 29). This was not optional
    — leaving it unfixed would have made `.github/workflows/ci.yml`
    permanently red from its first real run, which this design's own
    Risks section (Section 12) explicitly requires this milestone to
    avoid ("CI should never fail on its own first real run"). Every
    other change remains scoped to: new test files, new config/
    workflow files, `package.json`/`package-lock.json`, `CLAUDE.md`,
    and the new `TESTING.md`.
16. [ ] Zero database changes — confirmed via `git diff --stat`
    touching zero files under `supabase/migrations/`.

---

# 14. Verification Plan

**Local verification.** Run, in order, exactly what CI will run:
`npm ci` (on a clean clone, to catch any "works on my machine but not
from the lockfile" gap), `npm run lint`, `npx tsc --noEmit`, `npm run
test:coverage`, `npm run build`. All five must succeed before this
milestone is proposed as done.

**CI verification.** Open a real, throwaway pull request against this
branch after implementation to observe the Deliverable 9 workflow
actually run on GitHub's infrastructure — a YAML file that looks
correct is not evidence it works (this project's own standing "prove
it, don't infer" discipline, applied here to a new class of artifact
that has never existed in this repo before).

**Regression testing.** Every test added must be run against the
current, unmodified codebase and pass — if a test fails against
existing behavior, either the test is wrong (fix the test) or it found
a real, pre-existing bug (name it explicitly, do not silently "fix"
product code as a drive-by inside a testing milestone — report it and
let the user decide whether it's in scope here or its own follow-up,
per this project's standing scope discipline).

**Failure testing — proving the gates actually gate.** For each new
CI step, deliberately break something and confirm the pipeline fails
red, then revert:
- Introduce a temporary lint violation → confirm `eslint` fails the job.
- Introduce a temporary type error → confirm `tsc` fails the job.
- Introduce a temporary failing assertion in one test → confirm
  `vitest run` fails the job and reports the specific failing test.
- Commit a temporary `it.only(...)` in one existing test file →
  confirm `vitest run` fails the job via `allowOnly: !process.env.CI`
  (Deliverable 1),
  not a silent partial-suite pass that still exits 0.
- Introduce a temporary build-breaking syntax error → confirm `next
  build` fails the job.
Each is reverted immediately after confirming the red state, mirroring
the same discipline already used (and once nearly mis-stepped on, then
corrected) during this project's live `error.tsx` verification in
Milestone 29 — this time performed against CI, not a running dev
server, specifically to avoid any repeat of that interference risk.

**Edge cases, explicitly covered by the deliverables themselves:**
`getSafeRedirectPath`'s three attack-vector strings; `getProjectById`'s
three not-found-shaped cases; `computeDecisionConfidence`'s
empty-evidence and empty-sources branches; the analysis-session route's
empty-input and nonexistent-id cases. No edge case here is hypothetical
— every one is a branch that already exists in the real code, first
observed during this same audit (Section 5) or during prior
milestones' own design docs (`MILESTONE_29_DESIGN.md` Section 9).

---

# 15. Implementation Plan

**Sub-milestone 30.1 — Install and configure the test runner**
- *Purpose:* the foundational harness everything else depends on.
- *Files:* `package.json` (devDependencies, scripts, `engines`),
  `vitest.config.ts`.
- *Outcome:* `npm test` runs successfully against zero test files
  (an empty pass), proving the harness itself works before any real
  test is written.
- *Dependencies:* none.

**Sub-milestone 30.2 — Shared fixtures and the Supabase mock**
- *Purpose:* the shared infrastructure every later test file needs, so
  it's built once, reviewed once, and reused, not redefined per test.
- *Files:* `tests/fixtures/*.ts`, `tests/mocks/supabaseClient.ts`, plus
  the fixtures' own smoke test.
- *Outcome:* every fixture is proven schema-valid; the mock's typed
  surface compiles against `@supabase/supabase-js`'s real types.
- *Dependencies:* 30.1.

**Sub-milestone 30.3 — Pure-function unit tests**
- *Purpose:* the lowest-risk, highest-immediate-value tests — no
  mocking, no fixtures even needed for most of them.
- *Files:* `lib/format.test.ts`, `lib/validation/parse.test.ts`,
  `lib/errors/AppError.test.ts`, `lib/api/response.test.ts`.
- *Outcome:* four green test files; the co-located convention is
  demonstrated end-to-end.
- *Dependencies:* 30.1.

**Sub-milestone 30.4 — Representative knowledge-platform test**
- *Purpose:* prove the "one platform, deeply" pattern this design
  names as the template for a future, separate milestone to repeat
  across the other five.
- *Files:* `lib/decision/confidence/decisionConfidence.test.ts`.
- *Outcome:* the fake-timer pattern for date-sensitive logic is
  established and documented in `TESTING.md`.
- *Dependencies:* 30.1.

**Sub-milestone 30.5 — Services layer, mocked Supabase**
- *Purpose:* the first tests exercising this codebase's actual
  persistence logic, using 30.2's mock.
- *Files:* `lib/services/projects.test.ts`, `lib/services/auth.test.ts`.
- *Outcome:* `getProjectById`'s enumeration-resistance guarantee is
  verified for the first time (previously only reasoned about, per
  `MILESTONE_29_DESIGN.md`'s own Acceptance Criterion 4 caveat).
- *Dependencies:* 30.2.

**Sub-milestone 30.6 — Integration test**
- *Purpose:* the one integration-tier deliverable, proving the full
  route → service → store path.
- *Files:* `tests/integration/analysis-sessions.test.ts`.
- *Outcome:* the golden path, a validation-error path, and a
  not-found path are all covered against real, unmodified route
  handlers.
- *Dependencies:* 30.1 (does not need 30.2's fixtures/mocks — the
  session store needs no mock, per Section 5/7).

**Sub-milestone 30.7 — CI pipeline**
- *Purpose:* wire everything above into an actual, running gate.
- *Files:* `.github/workflows/ci.yml`.
- *Outcome:* a real PR shows the `CI` check passing (Acceptance
  Criterion 8) — verified live, not just written.
- *Dependencies:* 30.1–30.6 (CI runs the full suite; it should be
  written last so it has something real to gate on immediately).

**Sub-milestone 30.8 — Documentation**
- *Purpose:* make the new process discoverable and followable by the
  next engineer (human or AI), per this project's own Definition of
  Done ("documentation reflects reality").
- *Files:* `TESTING.md` (new), `CLAUDE.md` (Section 4 + Section 21
  edits).
- *Outcome:* `TESTING.md`'s instructions are followed literally, with
  no outside knowledge, and produce a passing local run (Acceptance
  Criterion 11).
- *Dependencies:* 30.1–30.7 (documents the finished state).

Each sub-milestone gets its own `tsc`/`eslint`/`vitest run` pass before
the next begins, per this project's established discipline
(`MILESTONE_29_DESIGN.md` Section 14 applied identically here).

---

# 16. Final Self Review

**Unnecessary complexity.** The one design choice most worth
challenging is the hand-rolled Supabase mock versus an
off-the-shelf library. Re-examined directly: the real client surface
this codebase touches is five methods across two files — a library
would add a dependency to model RPC/storage/realtime/OAuth surfaces
that don't exist in this codebase's usage at all. The hand-rolled
choice holds up under its own challenge.

**Duplicated logic.** None found — fixtures are built once and
imported everywhere they're needed (`tests/fixtures/index.ts`'s public
barrel, matching this project's own established "one shape, one public
barrel" convention already used by every `lib/*/index.ts`); the mock is
built once and imported by both `projects.test.ts` and `auth.test.ts`.

**Over-engineering, directly challenged:**
- *Should this milestone test all six knowledge platforms instead of
  one?* Considered and rejected — six platforms' worth of tests written
  against a pattern not yet proven once is the same mistake
  `ENGINEERING_BACKLOG_SHARED_UTILITIES.md` explicitly avoided when it
  extracted only Tier 1/2 duplicates and left Tier 3 alone rather than
  forcing a premature generalization. One deep, correct template first;
  mechanical repetition across the other five platforms is real,
  bounded, low-risk follow-up work (below), not part of proving the
  pattern.
- *Should CI enforce a coverage threshold now?* Considered and
  rejected (Section 12) — an enforced number today would either be
  trivially low (meaningless) or fail immediately (blocking legitimate
  work for the wrong reason). Report first; gate later, once there's a
  real baseline to ratchet from.
- *Should E2E/Playwright be bundled in, since it's "still testing"?*
  Considered and rejected — materially different infrastructure
  (browser binaries, visual assertions, slower CI), explicitly named as
  a separate bullet in `CLAUDE.md`'s own Milestone 7 text. Bundling it
  in would be exactly the "feature creep" the user's own instructions
  warned against.

**Maintenance burden, stated honestly.** This milestone's ~9 test
files are a real, ongoing cost — every one must be kept green as its
target changes, forever. This is accepted, not hidden: the alternative
(what this project has done for 29 milestones) is a *larger*, less
visible cost — undetected regressions — that this design trades for a
smaller, visible, actively-managed one.

**Architectural inconsistencies.** None found. This milestone
introduces zero new architectural patterns to the product codebase
itself (no new service, no new store, no new schema) — its only new
"architecture" is the test tree, deliberately shaped to mirror
patterns (public barrels, builder+overrides fixtures, one schema/shape
source of truth) this codebase already uses everywhere else, rather
than inventing a fourth convention alongside them.

**What this design deliberately does not claim.** It does not claim
Atlas AI becomes "fully tested" — 6 of 7 major `lib/` subsystems remain
without a single automated test after this milestone, named plainly in
Non-Goals and Risks rather than implied away. Its claim is narrower and
true: a real test runner, a real CI gate, and a proven, three-tier
pattern (pure/mocked/integration) now exist, ready for every future
milestone — starting with the natural next candidates this audit
surfaced — **mechanical unit-test coverage for the five remaining
knowledge platforms** (repeating Sub-milestone 30.4's proven template),
**mocking `lib/services/openai.ts`** to unlock testing the one service
this milestone deliberately left out, and **Playwright E2E for the
golden path** — to build on, rather than a claim this milestone quietly
overstates.

---

# 17. Principal Architect Review — Resolution Log

A full top-to-bottom re-read against 15 named review categories plus
the reviewer's explicit questions (coverage target, CI failure gates,
`.only` prevention, testing philosophy clarity, sub-milestone
independence). Findings and resolutions:

| # | Category | Finding | Resolution |
|---|---|---|---|
| 1 | CI design weakness / security | No guard against a committed `test.only`/`it.only`/`describe.only` silently skipping the rest of the suite while CI still exits 0. | Added explicit `allowOnly: !process.env.CI` to `vitest.config.ts` (Deliverable 1 — Vitest's real, shipped option; an earlier draft named a nonexistent `forbidOnly`, Jest's option name rather than Vitest's, corrected during implementation after checking the installed package's own type definitions directly, per this project's standing "verify, don't assume" discipline), a new Acceptance Criterion (13.9), and a failure-testing step (Section 14). |
| 2 | Security | Example placeholder Supabase URL used a subdomain of a real, live domain (`placeholder.supabase.co`) — not actually guaranteed to fail DNS resolution as claimed. | Switched every example to the IANA-reserved `.invalid` TLD (RFC 2606), which is guaranteed to never resolve (Deliverables 9, Section 10). |
| 3 | Security / CI design | No explicit least-privilege `permissions` block named for the GitHub Actions workflow. | Added `permissions: contents: read` at the workflow's top level (Deliverable 9, Section 10). |
| 4 | Documentation inconsistency | Acceptance Criterion 6 claimed `MILESTONE_29_DESIGN.md`'s enumeration-resistance gap was closed "in full," but a mocked unit test only verifies the application-layer half — the RLS/database-layer half still requires a live, second real account. | Reworded to explicitly scope the claim to the application layer and name the database-layer half as still open (Acceptance Criterion 6). |
| 5 | Scope-statement / integration-test-strategy inconsistency | Section 2 (Scope) claimed the integration test covers the `cancel`/`retry` route siblings; Deliverable 8 and Acceptance Criterion 7 only ever specified `POST`(create)/`GET`. | Reworded Section 2 to accurately describe only create+get, with an explicit, reasoned note on why `cancel`/`retry` are a named, understood (not silent) gap. No test scope was added — correcting prose, not expanding work. |
| 6 | Over-engineering | `vite-tsconfig-paths` added a new dependency to resolve a single, static, unlikely-to-change alias (`@` → project root) that a two-line manual `resolve.alias` handles identically. | Removed the dependency; `vitest.config.ts` now declares the alias manually (Deliverables 1–2, Architecture). |
| 7 | Mock strategy precision | The Supabase mock's documented surface described `listProjects`'s and `getProjectById`'s calls as one ambiguous, merged chain, obscuring that `getProjectById` uses two chained `.eq()` calls, not one. | Both Deliverable 5 and Architecture's Mock Strategy section now describe the two chains separately and explicitly. |
| 8 | Clarity / testing philosophy | "Business logic before UI, unit before integration, integration before E2E" was true in practice (via Non-Goals and the three-tier structure) but never stated as one explicit ordering principle. | Added an explicit "Testing philosophy" paragraph to Architecture (Section 7). |
| 9 | Missing acceptance criteria | No single Acceptance Criterion formally required confirming CI actually *fails* on a broken lint/type/test/`.only`/build state — only implied by the workflow's step list and the Verification Plan's failure-testing steps. | Added Acceptance Criterion 13.9, cross-referencing Section 14's already-specified failure-testing steps. |

**Explicitly confirmed, no change needed:**
- **Coverage target:** correct and justified as designed — measured
  and reported, not gated, because an enforced threshold today would
  be either trivially low or immediately blocking for the wrong
  reason (Section 12, Section 16). A future milestone can ratchet up
  an enforced minimum once a real baseline exists.
- **CI failure gates:** yes to all four — TypeScript errors, ESLint
  errors, failed tests, and failed builds each independently fail the
  pipeline (Deliverable 9), now with a formal Acceptance Criterion
  (13.9) and matching failure-testing steps (Section 14) confirming
  each one, not just the passing case.
- **Sub-milestone independence:** the 30.1–30.8 dependency graph
  (Section 15) is a clean, mostly-parallel DAG — 30.3/30.4/30.6 each
  depend only on 30.1, not on each other; each sub-milestone touches
  2–4 files; 30.7 (CI) and 30.8 (docs) are true finalization steps.
  No change needed.
- **Folder structure:** co-located unit tests never live under `app/`
  (Next.js's route-file convention isn't a risk here — every test file
  in this milestone's scope lives in `lib/`, `hooks/`, or `tests/`);
  the `tests/integration/` split for multi-file flows is sound. No
  change needed.

No finding in this review added a new test file, a new dependency, or
new product-facing scope — three findings *removed* a dependency
and/or corrected an overclaim, the rest sharpened wording or closed a
real gap using tooling (`allowOnly`, `permissions:`) already implied
by the original design, not new infrastructure.

---

*End of design specification. Awaiting review before Sub-milestone
30.1 begins. No code has been written, no dependency installed, no
file modified.*
