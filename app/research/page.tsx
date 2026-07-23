import { redirect } from "next/navigation";

// No standalone research workspace exists (Milestone 101 review):
// market intelligence is real but lives per-project
// (MarketIntelligenceCard), and unlike Competitors' own company data,
// it doesn't meaningfully aggregate across unrelated startup ideas — a
// cheap, honest cross-project view isn't possible here the way it was
// for /competitors. The nav entry that pointed here was removed
// (Sidebar.tsx); this route redirects rather than 404s, for anyone who
// still has it bookmarked or linked.
export default function ResearchPage() {
  redirect("/projects");
}
