"use client";

import IdeaInput from "./IdeaInput";
import AnalysisProgress from "./AnalysisProgress";
import ScoreCard from "./ScoreCard";
import Tabs from "./Tabs";

export default function Workspace() {
  return (
    <section className="grid gap-8 xl:grid-cols-[1fr_340px]">

      {/* Main Content */}

      <main className="space-y-8 min-w-0">

        <IdeaInput />

        <AnalysisProgress />

        <Tabs />

      </main>

      {/* Right Sidebar */}

      <aside className="min-w-0">

        <div className="sticky top-6">

          <ScoreCard />

        </div>

      </aside>

    </section>
  );
}