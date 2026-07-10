import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// The welcome section + primary CTA. Name is hardcoded ("Yasin"),
// consistent with the rest of the app today — there's no auth/session
// model yet (CLAUDE.md Roadmap Milestone 4).
//
// The gradient (from-primary via-indigo-600 to-purple-700) is a deliberate
// exception to "avoid raw Tailwind colors": it's a decorative, multi-stop
// hero treatment, not a semantically-meaningful surface, and indigo/purple
// don't have (or need) their own design tokens — see DESIGN_SYSTEM.md.
export default function DashboardWelcome() {
  return (
    <section className="flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-primary via-indigo-600 to-purple-700 p-8 text-white shadow-lg md:flex-row md:items-center md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-widest uppercase backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          Welcome back
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Good to see you, Yasin</h1>

        <p className="mt-2 max-w-xl leading-7 text-white/80">
          Describe your next startup idea and Atlas AI will stress-test it like an
          investment committee — market, competition, risk, and a final verdict.
        </p>
      </div>

      <Button
        render={<Link href="/dashboard/analysis" />}
        size="lg"
        className="shrink-0 gap-2 bg-white text-primary shadow-md hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-lg"
      >
        <Sparkles className="h-4 w-4" />
        Analyze a new idea
      </Button>
    </section>
  );
}
