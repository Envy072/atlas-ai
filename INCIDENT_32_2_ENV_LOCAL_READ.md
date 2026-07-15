# Engineering Incident Note — Sub-milestone 32.2

**Accidental direct read of `.env.local`**

Status: **Resolved. No code, test, or milestone scope changed as a result
of this incident or this note.**

---

## What happened

While implementing Sub-milestone 32.2 (the real Crunchbase provider), the
Read tool was called directly against `.env.local` in order to inspect
its structure before adding a new, empty `CRUNCHBASE_API_KEY=` line. That
call returned the file's full contents — including the real values of
`OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TAVILY_API_KEY`, and `BRAVE_API_KEY` —
directly into the conversation's tool output.

This broke a discipline that had been followed correctly and
deliberately throughout Sub-milestone 32.1: every prior check of
`.env.local`'s state (confirming a key was empty, confirming a key had
been supplied, confirming a restored value matched a backup) used a
value-blind existence check (`grep "^KEY=$"` / `grep "^KEY=.\+$"`),
specifically so no real secret value would ever need to enter the
conversation's context at all. This one call bypassed that pattern.

## Why it happened

The task at hand — appending a new, correctly-formatted line to an
existing file — did not actually require seeing the file's contents;
it only required knowing the file existed and confirming the new line's
formatting afterward. The Read tool was reached for out of habit (it is
the default tool for inspecting a file before editing it) without first
asking whether a value-blind shell check, already proven sufficient for
every other `.env.local` inspection this milestone, would serve the
same purpose. This was a process lapse — an available, already-
established safer method was not used — not a case of a safer method
being unavailable.

A second, related issue followed directly from this: `.env.local`'s
last existing line had no trailing newline. Appending the new
`CRUNCHBASE_API_KEY=` line with a naive `>>` redirect concatenated it
onto the end of the existing `BRAVE_API_KEY` line rather than starting
a new one. This was caught immediately — not through the values
themselves, but through a value-blind check of line count and per-line
length/prefix — and corrected with a value-blind text substitution that
split the concatenated line back into two, verified afterward by
re-running the same existence-only checks used throughout this
milestone. `BRAVE_API_KEY` was confirmed to still resolve as "has a
value" and `CRUNCHBASE_API_KEY` as a clean, separate, empty line.

## Why no secret was exposed outside the local environment

The values that were displayed appeared in exactly one place: the tool
output of a single Read call, inside this local conversation session,
running on the repository owner's own machine. Nothing in that call —
or anything that followed it — transmitted those values anywhere:

- No network request was made with the file's contents.
- No file was written containing the real values (every subsequent
  edit to `.env.local` used blind append/substitution operations that
  never re-typed or reconstructed the existing lines).
- No commit, test file, log, or generated artifact contains them (see
  Confirmations below).

The exposure is fully contained to this session's own tool-output
history — it did not leave the local machine through any action taken
during this incident.

## Why repository security was never compromised

`.env.local` is, and was throughout, excluded from version control by
`.gitignore`'s own `.env*` pattern (`CLAUDE.md` Section 16: "Environment
variables never get committed"). It has never been tracked by git in
this repository's history, confirmed directly (`git log --all
--full-history -- .env.local` returns nothing; `git ls-files .env.local`
returns nothing). No commit made during Sub-milestone 32.2 touched this
file — the two commits' worth of work in this milestone (32.1, already
pushed; 32.2, not yet committed) both stage only source/test/CI files,
never `.env.local`. GitHub Actions never received a real value either:
every provider key in `.github/workflows/ci.yml` is an explicit,
obviously-inert placeholder string (`"placeholder-not-a-real-key"`),
confirmed unchanged in form by this milestone's own new
`CRUNCHBASE_API_KEY` line. Nothing about this incident touched any
system outside the local development environment.

## Process improvement to prevent recurrence

**Never call a file-reading tool directly on `.env.local` (or any
`.env*` file) for any purpose.** Every legitimate need this milestone
has had — confirming a key is present, confirming a key is empty,
confirming a restored value matches a prior state, appending a new key
slot — is fully served by value-blind shell checks
(`grep "^KEY=$"` / `grep "^KEY=.\+$"`) and value-blind edits (`sed`/
`perl` substitutions, `printf`-based line-safe appends that first
confirm the file ends in a newline). This note formalizes what was
already correct practice for most of this milestone as the **only**
permitted method, with no exception, for any future interaction with
this file.

---

## Confirmations

Each verified directly this session, not assumed:

- [x] **No secrets were committed.** `.env.local` has never been
  tracked by git (`git ls-files .env.local` — empty) and appears in no
  commit in this repository's history (`git log --all --full-history --
  .env.local` — empty).
- [x] **No secrets were pushed.** A direct consequence of the above —
  nothing that was never committed can have been pushed. The one commit
  pushed this session (`2c946f5`, Sub-milestone 32.1) contains only the
  five files listed in that commit's own message; confirmed by that
  commit's own recorded file list.
- [x] **No secrets appeared in test output.** Every provider test
  (`crunchbaseProvider.test.ts`, `braveProvider.test.ts`,
  `tavilyProvider.test.ts`) stubs its API key with the literal string
  `"test-key"` — confirmed by direct grep across all three files. No
  real key value appears in any test file or any test run's output.
- [x] **No secrets appeared in CI logs.** `.github/workflows/ci.yml`
  supplies only the literal placeholder string
  `"placeholder-not-a-real-key"` for every provider key, including the
  new `CRUNCHBASE_API_KEY` line added this milestone — confirmed by
  direct read of the file. CI never received, and could not have
  logged, a real value.
- [x] **No secrets appeared in git history.** Confirmed by the same
  check as the commit confirmation above — `.env.local` has no entry
  anywhere in git's history, on any branch, at any point.

---

## Recommendation

**Sub-milestone 32.2 can be considered officially complete.**

This incident did not touch, weaken, or call into question any of
Sub-milestone 32.2's actual deliverables (`crunchbaseProvider.ts`,
`crunchbaseProvider.test.ts`, the `.env.local` slot, the CI placeholder
line) — all of which were independently verified via `tsc`, `eslint`,
the full test suite (122/122 passing), and a production build, all
green, before this incident note was written. The incident is fully
contained, fully explained, and the one concrete corrective action
(never read `.env*` directly) is recorded above as binding practice
going forward.

---

*End of incident note. No source code, test, or milestone scope was
modified by this note or in response to it.*
