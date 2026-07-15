@AGENTS.md

# Atlas AI Engineering Handbook

This handbook is the permanent engineering reference for Atlas AI. It
describes how the codebase actually works today and prescribes how every
future change should be made. When a change conflicts with this document,
the handbook wins unless it is explicitly amended first.

If you are an engineer (human or AI) working in this repository, read this
before writing code. If something here contradicts the code, treat the code
as the thing that needs fixing — or update this handbook explicitly. Don't
silently diverge from it.

---

## 1. Project Vision

### What Atlas AI is

Atlas AI is a market-intelligence platform for people about to build a
startup who want to know, honestly, whether they should. A founder
describes an idea in a few sentences; Atlas AI responds the way an
investment committee would — naming the customer, sizing the market,
mapping the competition, stress-testing the business model, and returning a
numeric score, a verdict, an investment decision, a confidence level,
strengths, weaknesses, risks, opportunities, and a next-steps roadmap, as
one structured analysis.

The system prompt driving this (`lib/services/openai.ts`) is deliberately
adversarial: Atlas AI is instructed to think like a Y Combinator partner, a
Sequoia investor, a McKinsey strategist, a product manager, a growth
marketer, a founder, and a financial analyst at once, and its job is
explicitly **not** to praise ideas — it challenges weak assumptions, never
invents statistics, and states assumptions plainly when information is
unknown. That adversarial posture is core to the product. A future change
that makes Atlas AI friendlier or more agreeable by default is a regression
against the product's stated purpose, not an improvement.

### Long-term goals

- Compress weeks of manual market research into a single conversation.
- Become the default "should I build this?" checkpoint before a founder
  writes product code — the same way a linter checkpoints before code ships.
- Build a durable historical record of every idea a founder has evaluated
  (the `projects` table), so Atlas AI's value compounds instead of resetting
  every session.
- Eventually support ongoing validation, not a one-shot analysis: re-running
  an idea against fresh market data and flagging when its risk profile has
  changed.

### Target customers

Early-stage/pre-funding founders and solo builders; indie hackers who want
investment-committee-level scrutiny without access to one; accelerator
applicants pressure-testing a pitch; product managers vetting an internal
bet before requesting engineering time; small VC scouts or angels wanting a
fast, consistent first pass on inbound deal flow.

### Why this product exists

Most startups fail for the same reason: they build something nobody needed,
in a market that couldn't support them, with a business model that didn't
survive contact with reality. That failure is almost always visible
*before* the first line of code is written — it just isn't visible to the
founder, who is structurally the worst-positioned person to be skeptical of
their own idea. Atlas AI is the skeptical outside voice that's otherwise
expensive, slow, or unavailable at the idea stage. It does not replace due
diligence; it replaces the absence of any due diligence at all.

---

## 2. Engineering Philosophy

Atlas AI's codebase optimizes for, in this order:

1. **Readability.** A fresh engineer or AI agent with no prior context
   should understand any file within a minute, without tracing five other
   files first.
2. **Maintainability.** Every abstraction must make the *next* change
   easier, not just the current one. A pattern that shrinks today's diff but
   makes next month's change harder is the wrong pattern.
3. **Scalability.** Architectural scalability, not just runtime performance:
   can this pattern support ten more services and fifty more components
   without collapsing into special cases? The layering in Section 3 exists
   for this reason.
4. **Consistency.** The same kind of problem is solved the same way
   everywhere. A new card looks like existing cards; a new service looks
   like existing services — consistency is what lets an engineer predict
   code they haven't read yet.
5. **Performance.** Optimized deliberately and measured, not guessed. See
   Section 15.

### Never optimize for short code

Fewer lines is not a goal. A clever three-line one-liner that requires
mentally simulating three operators is worse than eight explicit lines that
read top to bottom. Golfed code, chained ternaries, and cleverness for its
own sake are discouraged even when technically correct. If shortening code
makes it harder to explain to a teammate in one sentence, don't shorten it.

This cuts both ways: unnecessary abstraction is exactly as bad as
unnecessary cleverness, trading a small present convenience for a larger
future cost. The target is the simplest version of the code a new reader
can understand on first read — sometimes that's short, sometimes it isn't.

---

## 3. Architecture Rules

Atlas AI has six layers. Each has one job. Code doing another layer's job
in the wrong place is an architecture violation, even if it "works."

```
┌───────────────────────────────────────────────────────┐
│ App Router (app/) — routes, pages, layouts. Next.js     │
│  concerns only.                                          │
├───────────────────────────────────────────────────────┤
│ UI Layer (components/) — presentation. Reads state,      │
│  renders markup. No fetching.                              │
├───────────────────────────────────────────────────────┤
│ Hooks Layer (hooks/) — bridges UI to services/store.       │
│  Owns request lifecycle, not business rules.                 │
├───────────────────────────────────────────────────────┤
│ Store Layer (lib/store/) — Zustand. Shared state across      │
│  a component subtree.                                          │
├───────────────────────────────────────────────────────┤
│ Services / Business Logic (lib/services/) — talks to           │
│  OpenAI, Supabase, future externals. Framework-agnostic.          │
├───────────────────────────────────────────────────────┤
│ Cross-cutting (schemas, errors, validation, http, api,              │
│  format) — shared contracts every other layer depends on.            │
└───────────────────────────────────────────────────────┘
```

**App Router** (`app/`) contains only routing: which component renders at
which URL, route metadata, and (for API routes) request parsing/response
shaping. A route handler reads like a table of contents; the work is
delegated to services (Section 13, "thin routes").

**Services Layer** (`lib/services/`) is where business logic lives: calling
OpenAI, reading/writing Supabase, and in future calling Stripe or an auth
provider. Services are plain async functions with no `next/server` or React
imports, and no knowledge of whether their caller is a route handler, a
Server Component, or a future queue worker.

**Hooks Layer** (`hooks/`) gives a component a request lifecycle — loading,
error, success — around a service-backed operation. `useAnalyzeStartup`
decides *how* a component observes an in-flight request, not *what* a valid
analysis is. Hooks may call `lib/http/apiClient.ts` but must not embed
business rules.

**Store Layer** (`lib/store/`) holds Zustand stores, used to share state
across components without a direct parent-child relationship (e.g.
`IdeaInput` writing an analysis that `ScoreCard`/`Tabs` read several
components away). State only one component needs stays local (`useState`).

**UI Layer** (`components/`) renders things. A component reads props/store
selectors and returns JSX. It does not call `fetch`, does not import
`openai` or `@supabase/supabase-js`, and validates nothing beyond
presentational guards (`if (!analysis) return null;`).

**Business Logic Layer** is the same layer as Services above — the terms
are interchangeable. "Business logic" always means `lib/services/`, never a
component, hook, or route handler.

### Data Flow

```
UI component (button click)
  → hook (useAnalyzeStartup) manages loading state, calls apiClient
    → apiClient.postJSON (lib/http) sends the HTTP request
      → API route (app/api/chat/route.ts) validates the request
        → service (lib/services/analysis.ts) orchestrates the work
          → service (lib/services/openai.ts) calls the external API
          → schema (lib/schemas/analysis.ts) validates the result
        → service (lib/services/projects.ts) persists the result
      → route maps the outcome to a JSON response (lib/api/response.ts)
    → hook validates the response again (defense in depth), updates state
  → component re-renders from the new state
```

Any new external-facing feature follows this same shape: UI triggers a
hook, the hook talks to a route via the API client, the route delegates to
a service, the service does the work and returns a validated, typed result.

### State Flow

State is either **local** (`useState`, dies with the component, never read
by a sibling) or **shared** (a Zustand store, read across a subtree). There
is no third category — no context providers, no prop drilling through five
layers, no second global store to solve a problem local state or the
existing store already solves. See Section 7 for what qualifies as shared.

---

## 4. Folder Rules

Every folder has exactly one job. If unsure where a new file goes, find the
closest match below before creating a new folder.

**`app/`** — route segments (`page.tsx`, `layout.tsx`, `route.ts`),
route-level metadata, route-level `loading.tsx`/`error.tsx` (currently
missing). Never: business logic, direct OpenAI/Supabase calls, reusable UI.

**`components/dashboard/`** — components specific to the authenticated
dashboard shell and its widgets. Never: anything reused outside the
dashboard (promote to `components/shared/`), or business logic.

**`components/landing/`** — marketing/landing sections, intentionally
static — never import a hook, store, or service. Never: authenticated state
or live data.

**`components/layout/`** — app-wide chrome not specific to one page family
(`Navbar` today). Never: page-specific layout (`DashboardLayout`, or a
route's own `layout.tsx`).

**`components/shared/`** — small, generic presentational primitives with no
opinion about which feature uses them (`SectionHeader`, `IconBadge`,
`AnalyzeButtonLabel`, `LoadingChecklist`). Qualifies when a visual pattern
repeats **three or more times** across unrelated components (Section 11).
Never: business logic, store/hook access, anything feature-specific.

**`components/ui/`** — shadcn-generated primitives only (`button.tsx`).
Treat as vendored — regenerate from shadcn, don't hand-edit business
styling. Never: app-specific composites (those go in `components/shared/`).

**`components/workspace/`** — the idea-analysis feature's cards, tabs,
input surface, score display. Never: anything calling `/api/chat` without
going through `hooks/useAnalyzeStartup`.

**`hooks/`** — custom hooks wrapping a stateful async operation
(`useAnalyzeStartup`). Never: pure stateless utilities (`lib/`), or rules
about what a valid analysis *is* (the schema's job).

**`lib/api/`** — helpers shaping Next.js route responses (`jsonSuccess`,
`jsonError`), server-side only. Never: client-side fetch logic (`lib/http/`).

**`lib/errors/`** — the typed error hierarchy (`AppError` + subclasses) and
inspection helpers. Never: try/catch logic itself — this defines the
vocabulary, not the handling.

**`lib/format.ts`** — small, pure display-formatting functions
(`formatScore`, `formatPercent`). Split into `lib/format/` if it grows real
sub-concerns. Never: side effects, async.

**`lib/http/`** — the client-side fetch wrapper (`apiClient.postJSON`) for
calling this app's own routes. Never: calls to external third-party APIs
(those are `lib/services/`, called server-side).

**`lib/schemas/`** — Zod schemas and inferred types; the single source of
truth for a shape shared across layers (`AnalysisResultSchema`). Never:
fetching or other side effects.

**`lib/services/`** — business logic touching an external system
(`openai.ts`, `analysis.ts`, `projects.ts`, future `stripe.ts`/`auth.ts`).
See Section 8. Never: React, Next.js request/response objects.

**`lib/store/`** — Zustand store definitions (`analysisStore.ts`). Never:
more than one store per genuinely distinct domain of shared state.

**`lib/supabase/`** — the two shared Supabase client factories:
`client.ts` (browser, cookie-based session) and `server.ts` (server,
cookie-aware via `next/headers`, the one every service querying
`projects` must use for RLS's `auth.uid()` to resolve correctly). Never:
query logic (that's `lib/services/`), a third client construction point.

**`lib/utils.ts`** — the shadcn `cn()` helper and equivalents. Never:
feature-specific logic (`lib/format.ts`, a service, or a hook instead).

**`lib/validation/`** — generic validation helpers wrapping Zod
(`parseOrThrow`). Never: the schemas themselves (`lib/schemas/`) — this is
the mechanism, not the contract.

**`public/`** — static assets served as-is. Never: anything the build
should process (co-locate with its component, or use `next/image`).

**`tests/`** — shared test infrastructure only: `fixtures/`
(schema-valid synthetic builders, e.g. `buildProjectFixture`),
`mocks/` (hand-rolled test doubles, e.g. the Supabase client mock),
and `integration/` (multi-file flow tests spanning a route → service →
store, with no single natural home among them). A unit test for one
file lives *next to* that file instead (`lib/format.ts` +
`lib/format.test.ts`), not here — `tests/` holds infrastructure and
tests that genuinely don't belong to a single source file. See
`TESTING.md`. Never: product code of any kind.

---

## 5. TypeScript Rules

- **Strict mode is non-negotiable.** `tsconfig.json` has `"strict": true`.
  Don't weaken it, and don't add `// @ts-ignore` to silence an error —
  fix the type.
- **No `any`, ever.** Import the real type for an awkward third-party value
  (`LucideIcon` instead of `any` for an icon prop). For a genuinely unknown
  boundary value (a raw `JSON.parse` result pre-validation), type it
  `unknown` and narrow with a schema — never widen to `any`.
- **`type` for unions/aliases/`z.infer<...>` results; `interface` for object
  shapes** (props, service return values, anything extendable). Both are
  fine; be consistent within a file.
- **Derive types from schemas, never hand-duplicate them.** If a shape is
  already a Zod schema (`AnalysisResult`), every layer imports its inferred
  type — don't redeclare the fields as a second interface (that mismatch
  bug was fixed once already, in Sprint 2).
- **Every exported function and component prop has an explicit type.**
  Return-type inference is fine for simple functions; add an explicit
  return type when it would otherwise be surprising, or for a public
  service contract.
- **Optional schema fields are a deliberate choice.** If a field is
  `.optional()`, there's a real reason the API might not return it yet
  (e.g. `AnalysisResultSchema`'s sub-scores) — say why in a short comment.

---

## 6. React Rules

- **Functional components only.** No class components anywhere.
- **Server Components by default.** Add `"use client"` only when a file
  needs state, effects, event handlers, or a browser API.
  `app/projects/page.tsx` is the reference Server Component: it fetches via
  a service with zero client-side JavaScript.
- **Rules of Hooks, without exception.** Called unconditionally, at the top
  level, same order every render. Never inside a condition, loop, or nested
  function — not even "just this once."
- **Custom hooks own a lifecycle, not a business rule.**
  `useAnalyzeStartup` decides how a component observes a request; it does
  not decide what counts as a valid analysis.
- **Refs are for values, not render output.** Mutating a ref during render
  is a bug (`react-hooks/refs` caught it once already here) — sync a ref
  from props/state inside `useEffect`, never inline in the render body.
- **Composition over inheritance.** No component inheritance, ever. Shared
  visual/behavioral patterns become a small shared component
  (`components/shared/`), composed in — not a "base card" with overridable
  methods.
- **Props for local state, Zustand for shared state, nothing else.** Don't
  introduce React Context as a state-sharing mechanism — Zustand is the one
  shared-state mechanism, so there's never two competing patterns doing the
  same job.

---

## 7. Zustand Rules

- **One store per genuinely distinct domain of shared state.**
  `analysisStore.ts` is the only store and should stay that way until a
  truly unrelated domain appears (a future `authStore`). Don't split it up
  just to make one component's imports look tidier.
- **Selectors, always:**

  ```ts
  // Correct
  const analysis = useAnalysisStore((state) => state.analysis);

  // Wrong — re-renders on every store change, not just `analysis`
  const { analysis } = useAnalysisStore();
  ```

  Whole-store destructuring re-renders a component on *any* field change,
  even fields it never reads. All fifteen current consumers were migrated
  to selectors in Sprint 3 for exactly this reason; every new consumer
  follows the same pattern from day one.
- **Actions live in the store, not scattered across components.**
  `setLoading`, `setAnalysis`, `reset` are defined once; callers invoke
  them rather than computing partial updates inline.
- **Don't store derived data.** Anything computable from `state.analysis`
  is computed at read time, not duplicated as a second field that can drift.
- **The store isn't a server-data cache.** It holds the analysis currently
  being viewed/edited client-side — not a substitute for
  `services/projects.listProjects()` when a Server Component needs fresh data.

---

## 8. Services Rules

Services live in `lib/services/` and are the only place allowed to talk to
an external system. Every service function is `async`, returns a typed
value or throws an `AppError` subclass, and has zero React/Next.js imports.

**OpenAI service** (`openai.ts`) owns the client and the Atlas system
prompt. `generateStartupAnalysis(idea)` is the only export; it returns the
raw parsed JSON, **not yet schema-validated** (that's `analysis.ts`'s job).
A failed request or malformed JSON throws `ExternalServiceError`, never a
bare string or `Error`. The system prompt is the product's core IP — treat
changes to it as a product decision, reviewed as carefully as pricing.
Callers never supply their own prompt or model name; if Atlas AI ever
supports multiple providers, the provider-selection logic lives *inside*
this file, behind the same exported signature.

**Analysis service** (`analysis.ts`) orchestrates "idea string in, validated
`AnalysisResult` out": calls the OpenAI service, then `parseOrThrow`s the
result. This is the only function a route or Server Component calls for an
analysis — never call `generateStartupAnalysis` directly, which would skip
validation.

**Projects service** (`projects.ts`) owns all reads/writes to the Supabase
`projects` table. `persistProjectFromSession` logs and swallows a failure
rather than throwing (a persistence hiccup shouldn't fail the user-facing
response); `listProjects(userId)` returns `[]` (with a logged error) on
failure so callers never null-check. Any new query against this or a
future table is added here, never inlined into a page/component. If a
query's failure *should* be fatal, throw `ExternalServiceError("Supabase", ...)`
explicitly. As of Milestone 27c, this file is a second, explicit instance
of `auth.ts`'s own "framework-agnostic" exception below — it queries
through `lib/supabase/server.ts`'s cookie-aware client, since RLS's
`auth.uid()` requires a per-request session to resolve correctly.

**Future Stripe service** (`stripe.ts`, Milestone 5) follows the same
shape: owns the Stripe client and raw calls, with a higher-level function
combining Stripe + Supabase writes. Nothing outside `lib/services/` imports
`stripe` directly.

**Auth service** (`auth.ts`, Milestone 27a) owns session verification and
user lookup via `getCurrentUser(): Promise<AuthUser | null>` — the sole
server-side identity entry point. Routes/Server Components call this;
they never parse cookies or call Supabase Auth directly themselves.
Built on `lib/supabase/server.ts`'s cookie-aware client, which is why
this file (like `projects.ts` above) is a deliberate, named exception to
"services are framework-agnostic."

---

## 9. UI Rules

**Design language.** Large, soft-cornered white cards (`rounded-2xl`/
`rounded-3xl`) on a light gray page background (`#f8fafc`), a single primary
accent (blue-600), and a small semantic palette layered on top. Gradient
hero/summary blocks (`from-blue-600 to-indigo-700`, or `via-indigo-600
to-purple-700`) mark "this is the headline result" and should stay rare —
if every card gradients, none of them mean anything.

**Spacing.** Card padding: `p-6` standard, `p-7`/`p-8` for hero/emphasis.
Icon-plus-heading rows: `gap-3`/`gap-4`. Sibling card grids: `gap-6`.
Stacked sections: `space-y-5`/`space-y-6`/`space-y-8`, increasing with how
distinct the sections are. Don't invent a new spacing value without a
specific reason.

**Typography.** Eyebrows: `text-sm font-semibold uppercase
tracking-widest`, colored per the semantic palette. Headings: `text-3xl
font-bold` (`text-2xl` for a card sub-heading; `text-4xl`–`text-7xl`
reserved for hero numbers like the AI score). Body: `text-gray-600`/
`text-gray-700` with `leading-8` for multi-line prose. `Geist`/`Geist Mono`
(via `next/font`) are the only fonts — don't introduce another without
updating this section.

**Cards.** Every analysis card is a `SectionHeader` (eyebrow, heading,
optional description) followed by content blocks using `IconBadge` for any
icon-plus-label header, then AI-provided prose/lists. Build new cards from
these shared primitives (Section 11), not by copy-pasting an existing card.

**Buttons.** Primary: `rounded-2xl bg-blue-600 text-white
hover:bg-blue-700`, a visible disabled state. Loading content inside a
button uses `AnalyzeButtonLabel` (or an equivalent shared component for a
new action), not a bespoke spinner/text swap per call site.

**Colors.** Fixed semantic palette, reused rather than reinvented: **blue**
= primary/informational (market, competition, business model, default icon
badges); **green** = positive/growth/opportunity/solution; **red** =
risk/problem/warning; **purple** = sparing tertiary accent only (don't make
it a second primary).

**Responsive rules.** Mobile-first: base classes target the smallest
viewport, breakpoints add columns as it grows (`grid-cols-1 sm:grid-cols-2
xl:grid-cols-4` for stat grids, `lg:grid-cols-2` for paired detail cards).
Every new grid degrades to one column on mobile.

**Accessibility.** Known current gaps: decorative search inputs with no
handler, icon-only sidebar nav with no visible label, no `aria-label`s on
icon buttons. New interactive elements must not repeat these: every
icon-only control gets an `aria-label`, every input gets a label (visual or
`sr-only`), and focus states stay visible (shadcn's `focus-visible:ring-*`
tokens already do this on `components/ui/` — don't override them away).

---

## 10. Tailwind Rules

- **Utility-first, no bespoke CSS files.** `globals.css` exists only for
  the v4 `@theme`/token setup and base layer; feature styling is utility
  classes in JSX.
- **No custom naming convention** — Tailwind utilities used directly. For
  conditional + static class combinations, use `cn()` (`lib/utils.ts`,
  `clsx` + `tailwind-merge`), not manual string concatenation.
- **Ordering:** roughly layout → sizing → spacing → typography → color →
  state (`hover:`/`disabled:`/`focus:`). A readability convention only —
  class order has zero effect on rendering, so don't relitigate it in
  review beyond "is this readable."
- **Reusable utilities live in components, not `@apply`.** Five components
  sharing an identical `className` is a signal to extract a shared
  component (Section 11), not to define a custom CSS class.
- **No arbitrary magic values without a reason** (`p-6` over `p-[23px]`).
  If one is genuinely required, comment why.
- **Design tokens exist and are underused.** `globals.css` defines a full
  oklch light/dark token system that most components bypass for raw colors.
  This is tracked debt, not the standard to imitate. Prefer tokens
  (`bg-primary`, `text-muted-foreground`) in new cross-cutting UI work, but
  don't do a drive-by token migration inside an unrelated change.

---

## 11. Component Rules

- **Maximum responsibility: one.** A component orchestrates state via a
  hook, or renders UI — not both. It never contains `fetch`, `JSON.parse`,
  or validation logic itself.
- **Maximum size: roughly 150–200 lines before extracting something.** Not
  a hard lint rule, but growth past that is a sign of doing more than one job.
- **Composition over configuration explosion.** Accumulating boolean props
  for unrelated visual variants (`showX`, `compactMode`, `hideY`...) is a
  sign of two components that should be composed, not one growing prop surface.
- **Promote to `components/shared/` at three repetitions** — the rule
  applied in Sprint 3. Don't wait for a fourth/fifth copy, and don't
  extract after one or two occurrences (that's guessing at a pattern that
  might not repeat).
- **A shared primitive takes props for what varies, nothing else.**
  `IconBadge` takes `icon`/`size`/`bgClassName`/`textClassName` because
  those are the axes that actually vary — it doesn't take a `borderRadius`
  prop for a variant that doesn't exist yet.
- **Extraction must not change rendered output.** Refactoring duplicated
  markup into a shared component must produce the same DOM. Visual changes
  are separate, explicitly-scoped work — never bundled into "just a refactor."

---

## 12. Error Handling

- **Every deliberate error extends `AppError`.** `ValidationError`,
  `ExternalServiceError`, `InvalidRequestError` cover today's cases (bad
  AI/API shape, a downstream dependency failing, bad caller input). A new
  kind of deliberate failure gets a new subclass with the right
  `status`/`code`, never a bare `throw new Error(...)`.
- **Validate before an error becomes "unexpected."** Uncertain-shape data
  (a request body, an LLM response, a fetch response) goes through a schema
  and `parseOrThrow`, which turns a mismatch into a `ValidationError` instead
  of letting bad data propagate and fail somewhere less informative later.
- **Never swallow an error silently.** Every `catch` either re-throws
  (possibly as a more specific type), logs and returns a safe fallback (as
  `projects.ts` does for a failed insert/select, deliberately), or both. A
  bare `catch {}` with no logging and no rethrow is never acceptable.
- **Client and server both validate.** `useAnalyzeStartup` re-validates the
  API response against the same schema the server already checked — looks
  redundant, is deliberate: a client never trusts a shape just because the
  server "should" have checked it.
- **User-facing messages come from `AppError.message` only.** `jsonError`
  exposes an `AppError`'s message as-is (authored to be safe to show), but
  replaces any *unexpected* error's message with a generic fallback while
  logging the real one — never leak stack traces or driver-level errors to
  a client.

---

## 13. API Rules

- **Routes are thin controllers, nothing else.** Parse/validate the
  request, call one service (or a small sequence), map the result/thrown
  error to a response. `app/api/chat/route.ts` pre-/post-Sprint-3 is the
  reference: from a handler mixing OpenAI calls, JSON parsing, and Supabase
  writes, to a five-line orchestration of services.
- **Business logic belongs in services, always.** About to write
  `openai.chat.completions.create(...)` or `supabase.from(...)` inside a
  route handler? Stop — that call belongs in `lib/services/`.
- **One route, one concern.** Don't grow a handler to serve multiple
  unrelated purposes via a `type` switch — add a new route.
- **Responses are shaped by the shared helpers.** Use `jsonSuccess`/
  `jsonError` rather than constructing `NextResponse.json(...)` inline, so
  every route's shape stays consistent.
- **Input is validated before any external call.** Reject a malformed
  request before spending an OpenAI token or a Supabase round-trip on it.

---

## 14. Validation Rules

- **Always validate external input** — any HTTP request body, query param,
  or webhook payload is schema-validated before use.
- **Always validate AI output.** An LLM is exactly as untrusted as a
  network request for validation purposes: `AnalysisResultSchema` validates
  the OpenAI response before it's persisted or returned. A "return exactly
  this JSON schema" prompt instruction is a strong hint to the model, never
  an enforced contract.
- **Always validate API responses, even your own.** `useAnalyzeStartup`
  re-validates `/api/chat`'s response rather than trusting the route got it
  right every time.
- **One schema per shape, reused everywhere.** `AnalysisResultSchema` is
  defined once and imported by the service, route, hook, and store's type.
  A new shared shape gets the same treatment — one schema, one inferred
  type, never redefined by hand a second time.
- **Validation failures are `ValidationError`, not silent coercion.** Throw
  via `parseOrThrow` rather than coercing, defaulting, or partially
  accepting mismatched data. A partially-valid analysis is worse than a
  clear failure.

---

## 15. Performance Rules

- **Memoize with a reason, not by default.** `useMemo`/`useCallback` are
  for measured or clearly-predictable cost, not a reflex on every value.
- **Stabilize identities where it actually matters.**
  `useAnalyzeStartup` keeps `analyze`'s identity stable via a ref + effect
  (not a dependency on the caller's inline callbacks object), since callers
  pass a fresh object every render. Follow this pattern when a hook's
  returned function would otherwise churn identity for no functional reason.
- **Avoid duplicated renders from shared state.** Zustand selectors
  (Section 7) so a component only re-renders when the field it reads changes.
- **Lazy-load what isn't needed immediately.** Heavy, rarely-visited views
  are candidates for `next/dynamic`. Nothing today needs this, but a future
  admin panel or heavy chart addition would.
- **Streaming is a known gap.** `services/openai.ts` waits for the full
  completion before returning, so a user gets no partial feedback during a
  multi-second wait. The `ai` package is already installed for this reason
  and is currently unused — see Roadmap Milestone 6.
- **Measure before optimizing further.** No performance monitoring exists
  yet — don't add speculative caching/deduplication/virtualization for
  problems that haven't been observed; instrument first.

---

## 16. Security Rules

- **Environment variables never get committed.** `.env.local` is
  git-ignored. `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are read via `process.env` only, never
  hardcoded or logged in full.
- **`NEXT_PUBLIC_*` is public by definition** — shipped to the browser
  bundle. Only use that prefix for a value genuinely safe for any visitor
  to read (the Supabase anon key qualifies only because Supabase's security
  model relies on Row Level Security at the database layer, not key
  secrecy). Never prefix a real secret with `NEXT_PUBLIC_`.
- **Supabase security is a database-layer responsibility.** As of
  Milestone 27c, `projects` has RLS enabled with explicit `select`/`insert`
  policies keyed to `auth.uid() = owner_id` (`supabase/migrations/`),
  plus a `references auth.users(id)` foreign key on `owner_id` — no
  longer an open, unverified item for that table specifically. This only
  holds as long as every query against `projects` goes through a
  session-aware client (`lib/supabase/server.ts`) — a client with no
  per-request identity makes `auth.uid()` resolve to nothing, silently
  returning zero rows for everyone rather than enforcing anything. Any
  future table added to this database inherits the same requirement and
  starts from the same "unverified until proven otherwise" assumption.
- **OpenAI calls happen server-side only.** `OPENAI_API_KEY` is never read
  in a `"use client"` file or exposed in a response payload — always
  through `lib/services/openai.ts`.
- **Secrets are rotated, not just removed, if leaked.** Removing a key from
  a future commit does not undo its exposure in git history.
- **Validate input for security, not just correctness.** `/api/chat` has no
  request size limit and no rate limiting today — a single caller could
  send an arbitrarily large message or loop the route to drive OpenAI
  spend. This is an open item (Milestone 6); don't add a new unauthenticated
  endpoint with the same gap without flagging it.
- **Analysis session ids are sequential and guessable, not cryptographically
  random** (`lib/analysis-session/utils/id.ts`'s `nextSessionId()`:
  `` `session_${Date.now()}_${counter}` ``). Since `/api/analysis-sessions/[id]`
  and its `cancel`/`retry` siblings are deliberately public (anonymous
  users may run and view an analysis — Milestone 27's approved product
  decision), anyone who can guess or enumerate a nearby id can read,
  cancel, or retry a session they didn't start. Named explicitly as an
  open hardening task at Milestone 27c's own review, deliberately not
  fixed there or by any milestone since — fixing it means either
  switching to an unguessable id scheme or gating those routes (the
  latter contradicts the anonymous-analysis decision), a call for
  whoever picks this up next.

---

## 17. Git Workflow

- **Feature branches for anything beyond a single, reviewed sprint
  commit.** Early sprints landed directly on `main` under explicit human
  direction — a deliberate, supervised exception for a solo-founder-plus-AI
  workflow, not the steady state. Once more than one effort is touching this
  repo concurrently, work happens on a named feature branch and merges via
  review.
- **Commit style: imperative, scoped, honest about why.** "Add X" for new
  capability, "Fix X" for a bug, "Refactor X" for behavior-preserving
  restructuring — never blurred into a vague "update stuff." A message
  explains the reason, not just restates the diff.
- **Never mix a refactor and a feature in one commit.** Split them so a
  "refactor" commit can be confirmed behavior-preserving without also
  reviewing new logic.
- **Review process:** for solo/AI-assisted work, run `tsc --noEmit` and
  `eslint` before every commit and re-read the diff against this handbook.
  Once collaborators exist, every change lands via pull request with at
  least one reviewer — no direct pushes to `main`.
- **Never push broken code.** A commit failing `tsc --noEmit`, or
  introducing a new (not pre-existing) `eslint` error, doesn't get pushed.
  A pre-existing, unrelated lint issue is noted, not silently fixed as a
  drive-by.
- **Force-push and history rewriting require explicit sign-off** — never
  on a branch others may have already pulled.

---

## 18. Code Review Checklist

**Correctness**
- [ ] Does the change do what it claims, for the golden path?
- [ ] Does it handle a realistic edge case (empty input, network failure,
      malformed external response)?
- [ ] Any silently-swallowed errors (Section 12)?
- [ ] Anything relying on undefined ordering, timing, or race-prone state?

**Types**
- [ ] Zero `any`. Zero unnecessary `unknown` widening.
- [ ] Shared shapes imported from one schema/type, not redefined?
- [ ] `tsc --noEmit` passes with no new errors?

**Architecture**
- [ ] Business logic in a service, not a route/hook/component?
- [ ] Routes still thin (Section 13)?
- [ ] New shared state actually shared (Section 7), or should it be local?
- [ ] New files in the folder Section 4 says they belong in?

**Error handling & validation**
- [ ] Every deliberate failure throws a typed `AppError` subclass?
- [ ] All new external input (request bodies, AI output, API responses)
      validated against a schema?

**UI consistency**
- [ ] New UI reuses `components/shared/` primitives where a matching
      pattern exists, instead of duplicating markup?
- [ ] Spacing/typography/color match Section 9?
- [ ] Responsive (mobile-first) and keyboard/screen-reader accessible for
      any new interactive element?
- [ ] If meant to be a non-visual refactor, is rendered output actually
      unchanged?

**Performance**
- [ ] New Zustand consumers use a selector, not whole-store destructuring?
- [ ] New memoization justified by an actual cost, not reflexive?

**Security**
- [ ] New secrets read only server-side, never in a `"use client"` file?
- [ ] New endpoints considered for abuse surface (size/rate limits), even
      if not yet implemented — gap at least flagged?

**Process**
- [ ] `eslint` introduces zero *new* errors (pre-existing, unrelated issues
      left alone)?
- [ ] Commit message accurate and scoped (Section 17)?
- [ ] If this changes the architecture, is `ARCHITECTURE.md` updated?

---

## 19. Definition of Done

A task is finished only when all of the following are true:

1. **It does what was asked — no more, no less.** No unrequested redesigns,
   deletions, or dependency changes.
2. **`tsc --noEmit` passes with zero errors.**
3. **`eslint` introduces zero new errors or warnings**, beyond pre-existing,
   explicitly-acknowledged issues unrelated to the change.
4. **The golden path has been manually verified** — reasoned through at
   minimum, run directly where feasible.
5. **At least one realistic edge case has been considered** and handled
   per Section 12.
6. **Visual output is unchanged**, unless explicitly authorized otherwise.
7. **No dead code is left unexplained.** Intentionally-kept, not-yet-wired
   code is documented (here, in `ARCHITECTURE.md`, or a short comment) —
   never left as an unexplained loose end.
8. **No secrets, credentials, or `.env*` contents are committed.**
9. **Documentation reflects reality.** Architecture changes update
   `ARCHITECTURE.md`; standing-rule changes update this handbook.
10. **The commit/PR message explains why, not just what** (Section 17).

If any of these is false, the task is in progress, not done.

---

## 20. Sprint Workflow

Every unit of work moves through the same four stages:

**Design.** Understand the actual scope: what's asked, what's explicitly
out of scope ("no redesign," "no deleted files," "no route changes" have
all been binding constraints in past sprints), and which existing patterns
apply. Ask before guessing on ambiguous scope. For non-trivial, multi-file
work, form an explicit plan before touching code.

**Implement.** Write the smallest change that fully satisfies the request,
following every applicable rule in this handbook. Prefer several small,
reviewable changes over one enormous diff when the work decomposes
naturally. Respect every stated constraint, even restrictive-sounding ones
("keep every component," "look exactly the same") — they're almost always
protecting something not visible from the diff alone.

**Review.** Run `tsc --noEmit` and `eslint`. Re-read the diff against the
Code Review Checklist (Section 18). Verify the golden path and an edge
case. Anything surprising on a second read gets double-checked, not waved
through.

**Commit.** Write a message explaining why, per Section 17. Never push,
force-push, or rewrite history beyond what was explicitly requested. Report
what changed and what's still open — a commit existing doesn't mean the
task is done (Section 19).

---

## 21. Roadmap

Ordered by leverage — earlier milestones unblock later ones — not by
calendar date. None are scheduled to a specific sprint yet.

**Milestone 1 — Unify the analyze-idea implementation.** Two parallel
implementations exist today: `AIWorkspace` (local state, live on
`/dashboard`) and the `Workspace`/`Tabs`/Zustand tree (fully built, not
routed anywhere). Decide which is canonical and retire the other's
duplication. The single highest-leverage remaining piece of architectural
debt.

**Milestone 2 — Surface the full AI output.** `strengths`, `weaknesses`,
`risks`, `opportunities`, `next_steps`, `verdict`, `confidence`,
`investment_decision`, and four sub-scores are generated but never shown on
the live route. Wire the existing (orphaned) `RisksCard`/
`OpportunitiesCard`/`FinancialCard`/`WorkspaceHeader` into the canonical
implementation from Milestone 1, or build replacements if the design changes.

**Milestone 3 — Complete the surrounding product surface.** Fix
`/competitors` (currently renders a pasted copy of `/projects`). Add a
project detail route. Make dashboard search functional. Replace the static
stub pages (`/pricing`, `/reports`, `/research`, `/settings`) as each
becomes a priority.

**Milestone 4 — Authentication & multi-tenancy.** ✅ **Complete**, delivered
across Milestones 27a–28: a real `lib/services/auth.ts` session model
(27a); every project gains an owner, enforced by RLS, not just an
unused column (27c); user-specific routes gate behind a real session
check (27b); and the hardcoded "Yasin / Founder" identity is replaced
with the real signed-in user throughout the dashboard shell (28).

**Milestone 5 — Billing.** `lib/services/stripe.ts` plus a
pricing/subscription model — checkout, plan tiers, usage limits tied to a
real account (enabled by Milestone 4). `/pricing` becomes real.

**Milestone 6 — Reliability & scale hardening.** Rate limiting and
request-size limits on `/api/chat` and future external routes. Streaming AI
responses (the unused `ai` dependency exists for this). Route-level
`error.tsx`/`loading.tsx`. Retry/backoff for transient OpenAI/Supabase
failures.

**Milestone 7 — Testing & CI/CD.** ✅ **Delivered** (Milestone 30): a real
Vitest test suite — unit tests for the cross-cutting utilities and the
services layer (most valuable to test — framework-agnostic, easiest to
mock), a representative knowledge-platform test
(`lib/decision/confidence/`), and one full integration test against the
real `/api/analysis-sessions` route family — plus a GitHub Actions CI
pipeline (`.github/workflows/ci.yml`) blocking on lint/type-check/test/
build failure, on every push and pull request. See
`MILESTONE_30_DESIGN.md` and `TESTING.md`. **Not** delivered by this
milestone, named explicitly rather than silently dropped: end-to-end
tests for the golden path, preview deployments for pull requests, and
exhaustive unit coverage across the other five knowledge platforms
(`lib/decision`'s confidence engine is the proven template for that
follow-up) — each real, separately-scoped work.

---

## 22. Future Architecture

Atlas AI should grow for years without a rewrite, provided these hold:

**The services layer is the stable contract.** Routes, hooks, and UI change
freely — they're closest to product decisions. `analyzeStartup(idea):
Promise<AnalysisResult>` and `createProject(analysis): Promise<void>` should
stay callable with the same signature even if everything above them is
redesigned. When in doubt: business logic is core, presentation and
request-shaping are surface.

**Schema-first, additive evolution.** Schemas evolve by adding optional
fields, not renaming/repurposing existing ones — `AnalysisResultSchema`'s
optional sub-scores are the existing example, added ahead of the UI that
will consume them. A field that truly must change shape becomes a breaking
schema version with an explicit migration path, not a silent redefinition.

**New external integrations are new services, not new patterns.** Stripe,
an auth provider, a second AI provider, an analytics pipeline — each
becomes one new file in `lib/services/`, shaped like `openai.ts`/
`projects.ts` (plain async functions, typed errors, no framework imports),
so a new engineer can predict the shape of a service they've never seen.

**Provider swappability behind service boundaries.** Switching or adding a
model provider should be containable entirely inside
`lib/services/openai.ts` — callers depend on
`generateStartupAnalysis(idea): Promise<unknown>`, not on it being OpenAI
specifically. The same applies to Supabase behind `services/projects.ts`.

**From synchronous toward event-driven, only when it earns its keep.**
Today an analysis is generated synchronously within one HTTP request. If
analyses become richer (multiple model calls, longer processing), a
background job/queue may become necessary — `services/analysis.ts`'s
function becomes the work performed *inside* a job handler, unchanged
itself; only what invokes it and how results are delivered changes. Don't
introduce this before it's actually needed.

**Multiple frontends, one backend contract.** If a second client (mobile
app, partner API) ever appears, the services layer plus a thin, documented
set of routes is what it depends on — the reason routes stay thin and
services stay framework-agnostic in the first place.

**Backward compatibility is the default assumption, not a special
request.** Every sprint so far has operated under an explicit "don't break
routes, don't delete working code, keep visual output identical" constraint.
Treat that as the resting state for any future change, restated or not —
breaking it requires explicit, positive authorization every time.
