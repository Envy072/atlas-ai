// Shared, reusable product copy — small, pure string constants, no
// side effects, importable from a Server or Client Component alike
// (mirrors lib/format.ts's own "small shared helpers" shape). A string
// belongs here once it's rendered verbatim in more than one place;
// anything used in exactly one component stays inline there.

// The one-sentence "what Atlas AI does" description — shown identically
// by DashboardWelcome (the returning-user dashboard banner) and
// app/welcome/page.tsx (the post-signup welcome step, Milestone 48).
// Single-sourced so the two can never silently drift apart.
export const ATLAS_AI_PRODUCT_DESCRIPTION =
  "Describe your next startup idea and Atlas AI will stress-test it like an investment committee — market, competition, risk, and a final verdict.";
