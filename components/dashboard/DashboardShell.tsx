"use client";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import RightPanel from "./RightPanel";
import Workspace from "@/components/workspace/Workspace";

export default function DashboardShell() {
  return (
    <div className="flex h-screen bg-[#f8fafc]">

      {/* Sidebar */}
      <aside className="w-24 border-r border-gray-200 bg-white">
        <Sidebar />
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col">

        <Topbar />

        <div className="flex flex-1 overflow-hidden">

          <section className="flex-1 overflow-y-auto p-8">
            <Workspace />
          </section>

          <aside className="w-[360px] border-l border-gray-200 bg-white">
            <RightPanel />
          </aside>

        </div>

      </main>

    </div>
  );
}