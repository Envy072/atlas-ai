# Atlas AI — Version 2 Strategy

**The AI Venture Partner: From Analysis Tool to Startup Operating System**

*Prepared as a joint Founder / CTO / Principal Architect / Staff PM / VC
Partner / Senior AI Systems Designer review, grounded in a direct audit
of the repository as it stands after Milestone 31. Nothing in this
document assumes what a prior summary claimed — every factual claim
about the current system was re-verified against the actual code,
schemas, and product documents in this repository during this review.*

Status: **Strategy only. No code, no APIs, no components, no
milestones. Nothing in this document authorizes implementation.**

---

# 1. Executive Summary

Atlas AI has spent 31 milestones building something genuinely rare: a
six-platform, schema-first, evidence-linked knowledge architecture that
refuses to fabricate — a real technical asset, not a demo. What it has
not yet built is a reason for a founder to pay for it every month, or
for an investor to trust it as a category-defining category-defining
data source. Those are two different problems, and this document treats
them as such.

**The single most important finding of this review**: Atlas AI's
current bottleneck is not architecture. It is not scalability. It is
not even AI capability in the generic sense. It is that the system's
own most mature layer — Decision Intelligence — has almost nothing to
say. `deriveEmptyThesis()`, `deriveFindings()`, `deriveCriticalRisks()`,
and `buildRecommendation()` are, today, honest placeholders. Every
downstream artifact this review was asked to evaluate (Executive
Summary, Investment Memo, Due Diligence Report — wired at Milestone 31)
is a beautifully-built container for a judgment the system has never
actually rendered. **Atlas AI v2's entire mandate is to put a real,
evidenced, defensible judgment inside that container.** Everything else
in this document — pricing, competitive positioning, the lifecycle
roadmap — is downstream of that one fact.

The second most important finding: Atlas AI already has, unconfigured
and unused, exactly the data-ingestion architecture a real competitor
would need months to build (seven research providers, a ranking
engine, an evidence-aggregation layer, per-platform refresh policies).
**v2 does not need new plumbing. It needs real credentials, real
generation, and a bill.**

**Recommendation, stated plainly**: do not build v2 by adding more
knowledge platforms, more UI, or more "features." Build v2 by (1)
activating real search-provider data, (2) building the one genuinely
new capability this system has never had — AI-assisted, evidence-
constrained judgment generation — and (3) charging money for it. Every
other idea in this document is subordinate to those three.

---

# 2. Current State Assessment

Verified directly against the repository, not assumed from prior
summaries.

### Architecture maturity: 8/10

Six knowledge platforms (Research, Competitors, Market, Financial,
Business, Decision), each with an identical, disciplined shape
(`knowledge/`, `schemas/`, `storage/`, `refresh/`, a public barrel).
Zero cross-platform logic duplication that matters (the one confirmed
duplication — `dedupeByKey`/`urlNormalization`, five copies — is
trivial and already named as debt, not a structural risk). Every
platform defaults to an in-memory store; only `projects` is really
persisted, via Supabase with RLS. This is a sound, proven shape for
six platforms. It has not been proven at the scale a real, monetized
product would need (hundreds of concurrent founders, thousands of
persisted projects) — see Section 18.

### Decision/judgment maturity: 2/10

This is the gap that matters most. `DecisionProfile` — the record every
future product surface depends on — has real, computed confidence and
real, aggregated evidence, but **zero real findings, zero real risks,
zero real thesis, zero real recommendations**. Every one of those
fields is architecturally complete and semantically empty. A founder
using Atlas AI today, in this environment, receives a structurally
perfect report that says almost nothing about their actual idea.

### Data/evidence maturity: 3/10

Seven research providers are fully coded (`braveProvider.ts`,
`tavilyProvider.ts`, `googleProvider.ts`, `crunchbaseProvider.ts`,
`githubProvider.ts`, `newsProvider.ts`, `redditProvider.ts`) with a
working ranking engine and deduplication layer sitting on top of them.
**Zero of the seven have a configured credential in this environment.**
This is not a code gap. It is a business/ops gap that happens to be the
single fastest, cheapest fix available to this entire review — turning
on 2–3 of these providers is measured in days and dollars, not
engineering-months, and it is the precondition for every other claim
in this document about "evidence-backed" being true in practice rather
than in schema.

### Product/UX maturity: 4/10

One deep, genuinely well-crafted flow (idea → analysis → Decision
Report, now with three reshaped artifacts as of Milestone 31). Four
stub pages replaced with honest placeholders (Milestone 29), but
Reports/Research/Templates remain placeholders, not real features.
Dashboard search is real but shallow (title-substring only). The
product still reads, end to end, as **an analyzer a founder visits
once**, not a tool they return to weekly — exactly the gap
`PRODUCT_BACKLOG.md`'s own post-Phase-1 user testing already
identified, unprompted, before this review began.

### Engineering/testing maturity: 7/10 (a sharp, recent improvement)

Milestone 30 gave this project its first real test harness — Vitest,
CI, a proven three-tier pattern. Milestone 31 immediately proved that
pattern's value (18 new tests, first-ever automated coverage for three
previously-untested decision functions). This is real, compounding
discipline. It has not yet been extended past `lib/decision`'s three
artifact functions — the other five knowledge platforms remain
untested, a named, accepted, and correctly-sequenced gap.

### Business maturity: 1/10

Authentication and per-user persistence exist (Milestones 27–28) —
real infrastructure a SaaS product needs. **Nothing charges anyone
anything.** No Stripe integration exists (`lib/services/stripe.ts` is
a named-but-unbuilt future file since the original roadmap).
`/pricing` remains a stub. There is no tier, no limit, no metering,
no plan. Atlas AI today is architecturally SaaS-ready and commercially
a hobby project.

### Overall: a 9/10 backend wearing a 4/10 product, charging $0.

This is not a criticism of the 31 milestones that built it — it is the
correct, disciplined order to have built things in. It is, however,
exactly why this review exists: the foundation is genuinely done. The
product is not.

---

# 3. Product Vision

> **Atlas AI is the system a founder thinks alongside — from the
> morning they have an idea to the day they exit the company it
> became.**

Not a report generator. Not a search engine with a startup theme. Not
a chatbot with a system prompt. A persistent, evidence-disciplined
partner that remembers every decision a founder has made, why they made
it, what evidence supported it, and what changed since.

The product must never let a founder forget this distinction: **every
other AI tool in this space answers questions. Atlas AI is the only one
that keeps a decision record.**

---

# 4. Long-Term Mission

**Atlas AI's mission is to become the operating system founders build
their company on — not just the tool they consult before they start.**

Concretely, this means Atlas AI must eventually own, in one persistent
per-founder record: what was decided, why, on what evidence, with what
confidence, what was executed as a result, how the market responded,
and what changed. No competitor in this space (Section 8) is building
toward that record. Most are not even trying.

---

# 5. Product Philosophy

Six non-negotiable principles, each already load-bearing in the
existing codebase and each explicitly extended to every future
capability in this document:

1. **Never fabricate.** The single rule that makes every other claim in
   this document credible. An AI-generated finding without evidence is
   worse than no finding at all — it is a lie with a confident tone. v2
   must generate real judgment; it must never generate a plausible one.
2. **Decisions over data.** A page that shows fifteen facts and no
   verdict has failed. Every screen must answer "what does this mean"
   before "what do you know."
3. **Confidence over certainty.** Atlas AI must never claim to know
   more than its evidence supports. A 40%-confidence finding, shown
   honestly, is more valuable than a fabricated 95%.
4. **Adversarial by default.** Atlas AI's system prompt already
   instructs it to challenge weak assumptions, not flatter them
   (`CLAUDE.md` Section 1). This must never soften as the product
   scales toward paying customers who want to hear "yes." A founder who
   only hears agreement from Atlas AI has been sold a worse product
   than one who hears the truth.
5. **Founders stay in the loop.** Atlas AI advises; it does not decide
   for the founder and does not execute autonomously without the
   founder's own action. This is a moat (Section 10), not a limitation
   — see Section 20's explicit rejection of full autonomy.
6. **Compounding, not consumable.** Every interaction should make the
   founder's own record more valuable, not just answer one question
   and vanish. This is the entire justification for a subscription
   business model (Section 17) rather than a pay-per-report one.

---

# 6. User Personas

Verified against `CLAUDE.md`'s own stated target customers, sharpened
with a monetization lens this review adds:

1. **The Pre-Seed Solo Founder** ("Maya") — the core, current user.
   Needs a skeptical outside voice she can't otherwise afford. Price
   sensitive; will pay $20–40/month if the alternative is genuinely
   worse (a friend's opinion, no opinion at all).
2. **The Serial/Portfolio Founder** ("David") — building idea #3.
   Wants speed and pattern-matching against his own history — the
   longitudinal record (Section 4) is uniquely valuable to him, since
   he has more of it. Will pay for a higher tier that includes
   execution tooling (Section 15).
3. **The Accelerator Program Manager** ("Priya") — manages 20–100
   founders per cohort. Needs a standardized, comparable view across
   an entire cohort, not fifteen unrelated Notion docs. This persona
   does not exist as a target today and is the highest-leverage new
   persona for v2/Enterprise (Section 10, Section 17).
4. **The Angel/Scout Investor** ("Jordan") — screens 50+ decks a month.
   Wants a fast, consistent, evidence-backed first pass before
   spending real diligence time. Currently entirely unserved by this
   product.
5. **The Internal PM/Intrapreneur** ("Alex") — vetting a bet before
   requesting engineering time inside a company. Smallest persona by
   volume, highest willingness-to-pay per seat (expensed, not
   personal spend).

---

# 7. Customer Problems

Ranked by how directly Atlas AI's actual architecture already
addresses them:

1. **"I don't have anyone qualified to tell me my idea might fail."**
   Directly solved by the adversarial system prompt + Decision
   Intelligence, once judgment generation (Section 14) is real.
2. **"I don't know if what I'm reading is real or made up."** Directly
   solved by the evidence/confidence architecture — already the
   product's strongest, most defensible answer to any competitor.
3. **"I did an analysis three months ago and have no idea if it's
   still true."** Unsolved today. Every platform's `refresh/` policy
   already exists to answer exactly this — currently unused by any UI.
   A concrete, cheap v2 win (Section 15).
4. **"I don't know what to do with the analysis once I have it."**
   Unsolved today — the Execution gap (Section 12/13).
5. **"I'm an accelerator and every founder's diligence looks
   different."** Unsolved, unaddressed, and the single biggest
   untapped revenue opportunity in this document (Section 17).

---

# 8. Competitive Analysis

Evaluated directly, not from a generic market map — each comparison
grounded in what Atlas AI's own architecture can and cannot yet do.

| Competitor | What they do well | Where Atlas AI is already stronger | Where they're still stronger |
|---|---|---|---|
| **CB Insights / PitchBook** | Deep, broad market/deal data; trusted by institutional investors | Founder-first pricing and UX; a *decision*-shaped output, not a data terminal; per-founder longitudinal record | Raw data breadth and depth (years of proprietary deal data); enterprise trust and brand |
| **Crunchbase** | Company/funding database, broad coverage | Structured, evidence-linked *synthesis*, not just a lookup; never fabricates a summary | Company-data breadth; existing distribution and brand recognition |
| **Notion AI** | Flexible, general-purpose workspace AI | Domain-specific schema (findings, risks, confidence, readiness) no generic workspace tool has; a real decision record, not a wiki page | General-purpose flexibility; existing user base and habit |
| **Perplexity** | Fast, well-cited, general Q&A | A structured, accumulating business record vs. one-off answers; explicit business-analysis domain model | Raw search/answer quality and speed; broader general knowledge |
| **ChatGPT / Claude (raw)** | Maximum flexibility, no domain constraints | Everything: schema discipline, evidence enforcement, persistence, never-fabricate guarantee a bare chat interface structurally cannot offer without rebuilding this exact backend | Nothing structural — but they are free/cheap and already habitual, which is a real distribution threat, not a capability one |
| **Lovable / YC tools / AI app builders** | Turn a prompt into working software fast | Not a competitor at the Decision layer at all — a downstream execution tool | Everything at the *build* layer; Atlas AI should hand off to tools like this, not compete with them (Section 20) |

**The honest, uncomfortable finding**: Atlas AI's most dangerous
competitor today is not any product on this list — it is a founder
opening ChatGPT and typing "analyze my startup idea" for free. The
only reason Atlas AI wins that comparison is the discipline in Sections
5 and 9. If v2 ships without real evidence flowing through the system,
Atlas AI loses that comparison, because a generic LLM with a good
prompt currently produces more *content* than an honestly-empty
`DecisionProfile` does. This is the single strongest argument in this
entire document for why activating real research providers is not
optional polish — it is existential to the product's right to exist
next to a free alternative.

---

# 9. Market Positioning

**Atlas AI is not a market-intelligence platform, and it must never be
priced or marketed like one.** CB Insights/PitchBook sell to
institutions at five and six figures a year; that is not this
product's market and chasing it would abandon the founder-first
identity that is Atlas AI's actual advantage.

**Position statement:**

> Atlas AI is the AI Venture Partner for founders who can't afford a
> real one — and, as they grow, the record their next investor,
> accelerator, or bank trusts because it was never allowed to lie to
> them.

This positions Atlas AI to land in the founder-tools category
(alongside Notion, Linear, Vercel — tools a founder pays for
personally, monthly, without a procurement process) while building
toward a B2B2C wedge into accelerators and investors (Section 17) that
those tools never attempted.

---

# 10. Product Moat

Ranked by durability — hardest-to-copy first:

1. **The longitudinal, evidence-linked decision record.** Every month a
   founder uses Atlas AI, their own record gets more valuable and more
   annoying to abandon. This is the only moat on this list that
   compounds automatically with usage, requiring no additional
   engineering to strengthen.
2. **Architectural honesty as a trust asset.** A competitor *could*
   bolt citations onto a chatbot. Retrofitting "never fabricate" as a
   structural, schema-enforced guarantee (not a prompt instruction) is
   a multi-quarter rebuild for anyone starting from a generic chat
   product — Atlas AI already has it, for free, from 31 milestones of
   discipline.
3. **The two-sided network effect, once built (Section 17).** Once
   accelerators and investors trust Atlas AI's output format as a
   standardized "diligence passport," founders need to be on the
   platform their accelerator/investor already trusts — and
   accelerators/investors need the platform their founders are already
   using. Neither side exists yet; this is the single highest-leverage
   strategic bet in this document, not yet earned.
4. **Switching cost via execution lock-in (v3/v4, Section 13).** Once a
   founder's weekly tasks, hiring plan, and fundraising tracker live
   inside Atlas AI, leaving means abandoning operating history, not
   just a report.

**What is explicitly NOT a moat, and should never be treated as one**:
the underlying LLM. Anyone can call GPT-5 or Claude. Atlas AI's edge is
never "we have a smarter model" — it is everything above.

---

# 11. Core Capabilities

**What Atlas AI can already do today** (verified, Milestone 31):

- Run a full, six-platform synthesis (Research → Competitors → Market
  → Financial → Business → Decision) for any startup idea, anonymously
  or signed in.
- Persist a completed analysis permanently, scoped to its real owner,
  enforced at both the application and database (RLS) layers.
- Present that analysis as a live dashboard report, and — as of
  Milestone 31 — as three additional, purpose-built artifacts
  (Executive Summary, Investment Memo, Due Diligence Report), every
  finding and risk carrying its own inspectable evidence trail.
- Compute a real, honest, four-dimension confidence score for any
  analysis — never a fabricated single number.
- Gracefully and honestly degrade to "not enough data yet" rather than
  inventing an answer, at every layer, verified structurally (a
  `RiskFinding` cannot even be constructed without real evidence).
- Run this entire pipeline with automated test coverage on its newest,
  most product-critical layer (Milestone 30–31).

**What it cannot yet do** — the exact inverse of Section 2's
weaknesses, restated as capability gaps: generate a real finding,
thesis, risk, or recommendation from real evidence; re-validate a
stale analysis; carry a founder past the report into execution; charge
anyone; serve an accelerator or investor as a distinct user type.

---

# 12. Atlas AI Lifecycle

The user's own requested lifecycle, cross-checked against
`PRODUCT_BACKLOG.md`'s own, independently-arrived-at "AI Startup
Builder" vision (already on record in this repository, pre-dating this
review) — both converge on the same shape, which is itself evidence
this is the right lifecycle, not an invented one:

```
Idea
 ↓
Research        ← built (Milestones 1–19)
 ↓
Decision         ← built, but honestly empty (Milestones 20, 31) — v2's job
 ↓
Strategy         ← unbuilt — positioning/GTM refinement once Decision has real judgment
 ↓
Execution        ← unbuilt — matches PRODUCT_BACKLOG.md's "Execution Plan → Weekly Tasks → Validation → MVP → Launch"
 ↓
Growth           ← unbuilt — post-launch metrics, retention, re-validation loops
 ↓
Fundraising       ← unbuilt — investor CRM-lite, data-room generation from the decision record
 ↓
Hiring           ← unbuilt — role prioritization, informed by BusinessProfile's own execution/dependency data
 ↓
Scaling          ← unbuilt — the longest-horizon layer
 ↓
Exit             ← unbuilt, and the least urgent by a wide margin
```

**Strategic reading of this lifecycle**: everything from Research
through the honest half of Decision is done. Everything from a *real*
Decision through Fundraising is where nearly all near-term product
value lives. Hiring/Scaling/Exit are real, and belong on the roadmap
for completeness and long-term positioning — but are multi-year-out
concerns that should not consume a single hour of near-term planning.

---

# 13. Atlas AI Version Roadmap

Versions, not milestones — each defined by how far down the Section 12
lifecycle it genuinely reaches, and what it unlocks commercially. Named
by number rather than codename: in a document read by engineers,
investors, and product leaders alike, a stage-mapped version number
communicates more than a marketing codename would, and this document
already does the differentiating work codenames are usually asked to
do.

### Atlas AI v1 — The Foundation Era (complete, Milestones 1–31)

Idea → Research → Decision (structurally, not yet with real judgment).
Authentication, persistence, testing, CI. **Commercially: not a
product yet — an engine.**

### Atlas AI v2 — The Advisor Era (this document's primary subject, Section 14)

Completes Decision with real, evidence-generated judgment. Activates
real research providers. Introduces billing. **This is the first
version with a right to charge money**, because it is the first
version that actually gives an opinion.

### Atlas AI v3 — The Builder Era

Adds Strategy and Execution: positioning refinement, an execution
plan, weekly tasks, validation tracking, launch checklists — directly
fulfilling `PRODUCT_BACKLOG.md`'s "AI Startup Builder" vision. This is
the version that turns Atlas AI from a tool a founder visits once into
one they open every week.

### Atlas AI v4 — The Operator Era

Adds Growth, Fundraising, Hiring, Scaling. Atlas AI becomes, literally,
the system a company's early operating history lives inside — the
"operating system for building startups" the mission statement (Section
4) names directly.

### Atlas AI Network / Enterprise — a parallel track, not a sequential one

Accelerator and investor-facing surfaces (cohort dashboards, portfolio
diligence views, standardized deal-flow screening). **This should begin
in parallel with v2/v3**, not wait for v4 — it is a go-to-market and
network-effect play (Section 10), not a feature-completeness one, and
the two-sided value only starts compounding once it starts.

---

# 14. Atlas AI v2 Definition

**v2's one-sentence mandate: make Decision Intelligence actually
decide something, on real evidence, and charge for it.**

### What ships in v2

1. **Real research-provider activation.** At minimum Tavily + Brave
   (general web/search coverage) and Crunchbase (company/funding
   data) — real credentials, real evidence flowing through the
   already-built ranking and aggregation layer. Non-negotiable
   precondition for everything else in v2 to be honest.
2. **AI-assisted, evidence-constrained judgment generation.** Real
   implementations behind `deriveFindings()`, `deriveCriticalRisks()`,
   `buildInvestmentThesis()`, and `buildRecommendation()`'s calling
   logic — each constrained to cite only real, aggregated evidence
   already in the `DecisionProfile`, never free-generated prose. This
   is the one genuinely new AI capability this version needs; every
   surrounding schema and reshaping function already exists and needs
   no change.
3. **A real verdict.** Once findings/thesis are real, the Decision
   Summary and Investment Memo should surface an actual synthesized
   recommendation ("worth pursuing, conditional on X" / "weak
   fundamentals, here's why") — still never a fabricated numeric
   score, consistent with Section 5's confidence-over-certainty
   principle, but a real, evidenced position for the first time.
4. **Re-validation.** Every platform's existing `refresh/` policy
   (`isDecisionStale`, `collectStaleDecisions`, etc.) gets a real UI
   surface: "your analysis is 45 days old, here's what may have
   changed" — the cheapest possible way to turn a one-shot report into
   a recurring reason to return.
5. **Billing.** `lib/services/stripe.ts`, real tiers (Section 17), a
   real `/pricing` page. Free tier capped and metered; paid tier
   unlocks the full artifact suite and re-validation.

### What v2 explicitly does not attempt

Execution planning, weekly tasks, fundraising tooling, hiring, any
accelerator/investor-facing surface, any autonomous action-taking.
These are v3/v4/Network — real, valuable, and deliberately not this
version's job.

---

# 15. Major Feature Groups

Grouped by the version that owns them, per Section 13:

- **v2 — Judgment**: real finding/thesis/risk/recommendation
  generation; a real verdict; re-validation nudges; billing and
  metering.
- **v3 — Execution**: execution plan generation, weekly task
  breakdown, validation-experiment tracking, MVP scope definition,
  launch checklist — matching `PRODUCT_BACKLOG.md`'s own named
  sequence exactly.
- **v4 — Operating**: growth-metric tracking, an investor CRM-lite
  with auto-generated data-room artifacts (reusing the Investment
  Memo/Due Diligence Report artifacts already built), a hiring-plan
  generator informed by `BusinessProfile`'s existing execution/
  dependency data, scaling playbooks.
- **Network — Distribution**: accelerator cohort dashboards, investor
  deal-flow screening views, a standardized, shareable "diligence
  passport" export of a founder's own Atlas AI record.

---

# 16. Future AI Capabilities

Ranked by how directly each closes a gap named elsewhere in this
document:

1. **Evidence-constrained judgment generation** (Section 14) — the
   single highest-priority AI capability this product needs, full
   stop.
2. **A constrained, schema-aware "ask your record" assistant** — not a
   general chatbot (explicitly rejected, Section 20). A narrow
   interface that can only answer using a founder's own persisted
   `DecisionProfile` and its real evidence, so it inherits the
   never-fabricate guarantee rather than reintroducing the exact
   failure mode Section 8 identifies as this product's whole reason
   to exist.
3. **Streaming generation** — the `ai` package is already installed
   and unused (`CLAUDE.md`'s own Performance Rules name this gap).
   Directly improves perceived responsiveness once real generation
   (which is slower than today's honest-empty placeholders) ships in
   v2.
4. **Proactive re-validation triggers** — an AI-assessed "this market
   signal changed enough to matter" trigger on top of the existing,
   purely time-based staleness policy — a v3/v4-era refinement, not a
   v2 requirement.
5. **Execution-plan generation** (v3) and **investor-materials
   generation** (v4) — both are the same underlying capability
   (evidence-constrained generation) applied one lifecycle stage
   further down; no new AI architecture required once #1 is real.

---

# 17. Business Strategy

### Pricing tiers

| Tier | Price | Who | What |
|---|---|---|---|
| **Free** | $0 | Trying the product | 1–2 analyses/month, Executive Summary only, no persistence beyond 30 days |
| **Founder** | $29–39/mo | Maya, David (early) | Unlimited analyses, full artifact suite, permanent history, re-validation nudges |
| **Builder** | $79–99/mo | David (repeat), serious solo founders | + v3 Execution layer once shipped |
| **Accelerator / Investor** | Custom, seat- or cohort-based | Priya, Jordan | Cohort dashboards, portfolio-wide diligence views, standardized exports |

### Target customers, in acquisition order

1. Individual pre-seed founders (self-serve, low CAC, product-led).
2. Serial founders and small internal teams (upsell into Builder).
3. Accelerators (direct sales, one deal = dozens of founder seats).
4. Angel/scout investors (direct sales or accelerator-channel
   introduction).

### Expansion strategy

Land with individual founders at low price and high volume. Use
accelerator partnerships as a distribution multiplier (one accelerator
deal seeds an entire cohort of new individual users, many of whom stay
past the program). Only then formalize the investor-facing product,
once enough founder-side density exists to make deal-flow screening
genuinely useful rather than a cold-start product with no data.

### Retention

The longitudinal record (Section 10) is the retention mechanism by
construction — the more a founder uses Atlas AI, the more expensive it
is to leave. Re-validation nudges (Section 14) are the recurring
*reason* to open the app; without them, v2 risks becoming a one-time
purchase disguised as a subscription, which is not a durable business.

### Growth loops

The Network track (Section 13) is Atlas AI's only genuine growth loop:
an accelerator mandates the tool → founders adopt it → some founders
stay and refer peers outside the program → investors who see enough
Atlas AI-formatted materials start requesting it directly → more
accelerators adopt it to stay compatible with investor expectations.
This loop does not exist until the Network track is deliberately
built — it will not emerge from the founder-only product alone.

---

# 18. Technical Strategy

**The existing architecture is sufficient for v2. It does not need a
rewrite, and this review explicitly recommends against one.**

What v2 genuinely requires, in order of priority:

1. **Real provider credentials** — an operational/business task, not
   an engineering one.
2. **One new capability**: evidence-constrained generation logic
   behind the existing, unchanged `derive*()`/`build*()` seams already
   named for exactly this purpose since Milestone 10. This is
   additive — no existing schema, service, or route changes shape.
3. **A real Stripe integration** — one new service file, following the
   exact shape every other service in this codebase already uses
   (`CLAUDE.md` Section 22's own stated pattern for this).
4. **Modest storage consolidation before scaling further**: each of
   the five knowledge platforms currently scaffolds four storage
   backends (Memory/Postgres/Supabase/Warehouse); only Memory is real
   and only `projects` (via Supabase) is genuinely used. Before adding
   a sixth platform or meaningful concurrent load, collapse this to
   Memory + Supabase only, and retire the Postgres-raw and
   Warehouse-specific variants until an actual analytics need
   justifies them — carrying four speculative backends per platform is
   the one piece of this architecture that is over-built relative to
   what's actually used.
5. **Pay down Technical Debt #1** (`dedupeByKey`/`urlNormalization`,
   five copies) before a sixth knowledge platform would otherwise add
   a sixth — cheap now, compounding later.
6. **Extend the Milestone 30 test pattern** to the five knowledge
   platforms' own pure logic before adding real generation on top of
   them — untested code becomes materially riskier once it's the input
   to an AI-generation layer that will be trusted with real judgment.

**Explicitly not recommended**: replacing the six-platform
architecture, introducing a second state-management or persistence
pattern, or building new infrastructure ahead of the real bottleneck
(Section 1 — judgment, not plumbing).

---

# 19. Risks

- **Shipping real generation before real evidence.** If judgment
  generation ships before real providers are configured, Atlas AI
  will confidently reason from thin or absent data — the exact failure
  this product's entire identity is built to prevent. Sequencing
  matters: Section 14's item 1 must ship before item 2, not
  concurrently.
- **Softening the adversarial posture under monetization pressure.** A
  paying customer wants to hear good news. The single biggest cultural
  risk to this product is quietly making Atlas AI more agreeable to
  improve conversion — directly betraying Section 5's core principle
  and the product's actual differentiation.
- **Network-effect track failing to materialize.** If accelerator/
  investor adoption never happens, Atlas AI remains a (still viable,
  still valuable) founder subscription tool without its strongest
  long-term moat. This risk should be actively tracked, not assumed
  away.
- **Provider cost scaling faster than revenue.** Real search-provider
  API costs scale with usage; the free tier must be capped tightly
  enough that this reversal never becomes viable at scale.
- **Feature creep re-emerging now that "v2" sounds bigger than a
  milestone.** The single most important discipline this document must
  reinforce, not undo: Sections 14/20 exist specifically to prevent
  "think bigger" from becoming "build everything."

---

# 20. Non-Goals

Explicitly, permanently rejected — not deferred, rejected:

- **A general-purpose chatbot feature.** Undifferentiated against
  ChatGPT/Claude directly; the moment Atlas AI competes on "chat with
  an AI" instead of "trust a decision record," it has already lost.
- **Fully autonomous execution** ("Atlas AI runs your company"). Directly
  contradicts Section 5's "founders stay in the loop" principle and
  the adversarial-advisor identity this entire product is built
  around. An advisor that acts without you is not an advisor.
- **A freelancer/agency marketplace.** A different business (two-sided
  marketplace operations) with a different moat, different sales
  motion, and no connection to the decision-record asset this document
  is built around. A future partnership channel, never a built
  feature.
- **Vanity, real-time "live market monitoring" dashboards.** Expensive
  to build and maintain, low decision-relevance for the actual
  personas in Section 6, and exactly the kind of data-terminal
  positioning Section 9 explicitly rejects.
- **Chasing CB Insights/PitchBook on data breadth.** Cannot be won
  head-on with this product's resources or business model, and winning
  it would not matter to any persona in Section 6.
- **Rewriting the six-platform architecture.** Sound, tested, and not
  the bottleneck (Section 1, Section 18).

---

# 21. Success Metrics

- **Judgment quality, not just judgment presence**: % of generated
  findings/recommendations a real founder rates as genuinely useful
  (not just "present") — the only metric that actually tests whether
  Section 14 succeeded.
- **Weekly active founders per paying account** — the direct test of
  whether re-validation (Section 14) turned a one-shot tool into a
  recurring one.
- **Net revenue retention** — the direct test of whether the
  longitudinal-record moat (Section 10) is real or theoretical.
- **Accelerator cohorts onboarded** and **% of a cohort's founders
  still active 90 days post-program** — the direct test of the Network
  growth loop (Section 17).
- **Zero tolerance metric**: any confirmed instance of a fabricated
  finding, statistic, or recommendation reaching a user. This is not a
  target to improve — it is a hard gate, tracked the same way a
  security incident would be.

---

# 22. Launch Strategy

1. **Ship v2's judgment + evidence layer privately first**, to a small
   set of real founders (existing personal network, not a public
   launch), specifically to test the zero-tolerance fabrication metric
   (Section 21) before any paid customer sees it.
2. **Launch Founder tier publicly** once that private cohort confirms
   real, evidence-backed judgment holds up — product-led, self-serve,
   no sales motion required.
3. **Approach 2–3 accelerators directly** once the public Founder tier
   has enough real usage data to make the pitch concrete ("here's what
   founders like yours actually do with it"), not hypothetical.
4. **Layer in the investor-facing surface** only after accelerator
   adoption produces genuine founder-side density — never launch the
   two-sided network effect with only one side populated.

---

# 23. Future Vision

Five years from now, a founder should be able to say: *"I decided to
build this because Atlas AI told me the truth about it. I built it the
way I did because Atlas AI helped me plan it. I raised money with a
data room Atlas AI generated from decisions it watched me make. I hired
my first ten people off a plan it helped me prioritize. And when I
sold the company, the buyer's diligence team asked for my Atlas AI
record first, because they'd learned to trust it."**

That is the operating system this document is describing the first
real step toward. Every version in Section 13 is one honest,
non-skippable step closer to it — and none of it is worth building if
Section 14's one sentence isn't true first: **make Decision Intelligence
actually decide something, on real evidence.**

---

*End of strategy document. No code written. No repository modified. No
milestone created. This document defines direction; it does not
authorize implementation.*
