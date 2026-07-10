"use client";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import RightPanel from "./RightPanel";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-[#f8fafc]">

      {/* Sidebar */}
      <aside className="w-24 border-r border-gray-200 bg-white">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">

        <Topbar />

        <div className="flex flex-1 overflow-hidden">

          {/* Workspace */}
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>

          {/* Right Panel */}
          <aside className="w-[360px] border-l border-gray-200 bg-white">
            <RightPanel />
          </aside>

        </div>

      </div>

    </div>
  );
}