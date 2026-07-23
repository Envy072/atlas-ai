# Atlas AI — Testing Guide

The test runner is [Vitest](https://vitest.dev). This document is the
practical reference for running tests locally, where to put a new one,
and what CI actually checks. The design rationale behind every choice
here lives in `MILESTONE_30_DESIGN.md` — this file is the "how," that
one is the "why."

---

## Running tests locally

```bash
npm test              # run the full suite once, exit non-zero on failure
npm run test:watch    # re-run affected tests on save
npm run test:coverage # run once, with a coverage report (terminal + coverage/)
```

Run these before every commit, alongside the existing `tsc --noEmit`
and `eslint` (`CLAUDE.md` Section 20's "Review" stage) — this is a
third command added to that same ritual, not a new one.

`coverage/` is generated output, gitignored — never commit it.

---

## Where a test lives

**Unit test → co-located, next to the file it tests.**

```
lib/format.ts
lib/format.test.ts
```

A unit test's only relevant context is the one file it tests.
Co-locating means a rename/move naturally carries the test with it —
no parallel mirror tree to keep in sync. This is the default for
almost every new test.

**Integration test → `tests/integration/`.**

An integration test exercises *multiple* real files together (a route
→ a service → a store) with no single natural home among them —
`tests/integration/analysis-sessions.test.ts` is the existing example.

**Shared fixtures → `tests/fixtures/`. Shared mocks → `tests/mocks/`.**

Anything more than one test file needs (a synthetic `Project`, a
Supabase client double) belongs here — see below.

`CLAUDE.md` Section 4 documents this as a binding Folder Rule, not
just a convention.

---

## Writing a new unit test

```ts
// lib/example.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "@/lib/example";

describe("myFunction", () => {
  it("does the thing", () => {
    expect(myFunction(1)).toBe(2);
  });
});
```

`describe`/`it`/`expect`/`vi` come from `"vitest"` — the same API Jest
uses, so there's nothing new to learn beyond that import.

**If the function reads `Date.now()`/`new Date()`** (anything
time-relative — see `lib/format.ts`'s `formatRelativeTime` or
`lib/decision/confidence/decisionConfidence.ts`'s freshness
calculation): pin the clock, or the test is flaky by construction.

```ts
import { vi, afterEach } from "vitest";

afterEach(() => {
  vi.useRealTimers();
});

it("formats a fixed instant", () => {
  vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));
  // ...
});
```

---

## Adding a fixture

`tests/fixtures/` holds builder functions returning schema-valid
synthetic data — `buildProjectFixture`, `buildDecisionProfileFixture`,
`buildVerificationSummaryFixture`, all exported from
`tests/fixtures/index.ts`'s public barrel (import from there, not a
deep path).

**Prefer composing real production builders over hand-authoring a
shape.** `buildDecisionProfileFixture` doesn't hand-write
`DecisionProfile`'s large, nested shape — it calls the real
`buildMarketProfile`/`buildFinancialProfile`/`buildBusinessProfile`/
`buildDecisionProfile` functions each knowledge platform already
exports (pure, synchronous, zero network calls), so the fixture is
schema-valid by construction, via the same code path production uses.
Look for an equivalent real builder before hand-rolling a new shape.

Every fixture builder re-validates its final output (`parseOrThrow`)
before returning — an override that produces an invalid object fails
loudly at the fixture call site, not as a confusing failure somewhere
else. `tests/fixtures/fixtures.test.ts` is this barrel's own smoke
test; add a case there when adding a new fixture builder.

---

## Extending the Supabase mock

`tests/mocks/supabaseClient.ts`'s `createMockSupabaseClient()` is a
small, hand-rolled mock implementing only the exact Supabase client
call chains `lib/services/projects.ts` and `lib/services/auth.ts`
actually use — not a general-purpose Supabase mocking library, which
this codebase's usage doesn't need.

**Extend it only when a service starts calling a new method** — don't
pre-build support for a Postgrest chain nothing calls yet. If
`lib/services/*.ts` adds a call to, say, `.update()`, add exactly that
method to the mock, typed against `@supabase/supabase-js`'s own
`SupabaseClient` type so a real signature change becomes a compile
error here, not a silent mismatch.

Any service that calls `lib/supabase/server.ts`'s `createClient()`
must be tested with this mock — calling the real one under Vitest
throws (`cookies` was called outside a request scope`), since
`next/headers`'s request-scoped context doesn't exist outside Next's
own server runtime:

```ts
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
const mockedCreateClient = vi.mocked(createClient);

// in a test:
mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
```

---

## Writing an integration test

Call the real, exported route handler(s) directly with a constructed
`Request` — no `fetch`, no running server:

```ts
import { POST } from "@/app/api/analysis-sessions/route";

const response = await POST(
  new Request("http://localhost/api/analysis-sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startupIdea: "..." }),
  })
);
```

Mock only what's genuinely external to the flow under test (e.g. the
Supabase auth read, for the reason above) — never the thing the
integration test exists to prove. `tests/integration/
analysis-sessions.test.ts` calls the real `lib/analysis-session`
lifecycle against its real (already in-memory by default) store, and
runs the real six-stage pipeline synchronously — no mocking of any of
that. It's safe to do this because every research provider
(`lib/research/providers/*`) checks its own API key first and returns
`"not_configured"` immediately — zero network calls — when absent,
which is this environment's actual state.

**If a new integration test pulls in a lot of code** (as this one
does — the full pipeline), consider whether it needs a longer
`testTimeout` than the suite's default. `vitest.config.ts` already
sets a global `testTimeout: 30_000` for exactly this reason — v8
coverage instrumentation across ~250+ files measurably slows this
particular test (~500ms uninstrumented, up to ~14s instrumented under
the full suite), which occasionally exceeded Vitest's 5000ms default
and would have made CI flaky. Don't lower this value without
re-measuring first.

---

## What CI checks

`.github/workflows/ci.yml` runs on every push to `main` and every pull
request, in order, failing fast on the first failing step:

1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run test:coverage`
5. `npm run build`

**No real secrets are used.** The build step's env vars
(`NEXT_PUBLIC_SUPABASE_URL`, etc.) are obviously-fake placeholders —
`https://placeholder.invalid` uses the IANA-reserved `.invalid` TLD
(RFC 2606), guaranteed to never resolve. No test in this suite makes a
real network call, so no real credential is ever needed in CI.

To reproduce the CI build locally (confirms it genuinely doesn't need
real secrets):

```bash
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.invalid" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-not-a-real-key" \
OPENAI_API_KEY="placeholder-not-a-real-key" \
BRAVE_API_KEY="placeholder-not-a-real-key" \
TAVILY_API_KEY="placeholder-not-a-real-key" \
npm run build
```

**Coverage is reported, not gated.** `npm run test:coverage` prints a
summary and writes `coverage/`, but no minimum percentage fails the
build — see `MILESTONE_30_DESIGN.md` Section 12 for why an enforced
number today would be premature.

---

## What isn't tested yet

Named honestly, not silently implied away (`MILESTONE_30_DESIGN.md`
Non-Goals/Final Self Review):

- All six knowledge platforms (`lib/market`, `lib/financial`,
  `lib/business`, `lib/competitors`, `lib/research`, `lib/decision`) now
  have dedicated test coverage, following the template
  `lib/decision/confidence/` first proved (Milestones 52–99).
- `lib/services/openai.ts` is covered (Milestone 34), mocking the OpenAI
  SDK client itself — the one external boundary this file owns.
- No end-to-end/browser tests (Playwright) and no React component
  tests (Testing Library) exist — both are a materially different,
  larger investment than unit/integration tests, deliberately deferred.
