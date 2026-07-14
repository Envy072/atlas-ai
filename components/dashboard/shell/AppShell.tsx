"use client";

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import Sidebar from "@/components/dashboard/shell/Sidebar";
import Header from "@/components/dashboard/shell/Header";
import type { ProfileMenuUser } from "@/components/dashboard/shell/ProfileMenu";

interface AppShellProps {
  children: React.ReactNode;
  user: ProfileMenuUser | null;
}

// The new dashboard shell: a persistent, collapsible sidebar (desktop) or
// an overlay drawer (mobile) plus a header, wrapping whatever page content
// is passed in. Applied today via app/dashboard/layout.tsx to /dashboard
// and /dashboard/analysis only — see DASHBOARD.md for why the rest of the
// app's routes aren't wrapped in this yet.
export default function AppShell({ children, user }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    // reducedMotion="user" makes every framer-motion animation in this
    // subtree (sidebar collapse, mobile drawer) honor the OS-level
    // prefers-reduced-motion setting automatically. The global CSS rule in
    // globals.css covers plain CSS transitions/animations elsewhere, but
    // can't reach framer-motion's JS-driven animations — this is that
    // same guarantee for this subtree specifically.
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen bg-background">
        <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header onOpenMobileMenu={() => setMobileNavOpen(true)} user={user} />

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </MotionConfig>
  );
}
