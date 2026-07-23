"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  Users,
  FileText,
  LayoutTemplate,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";
import SidebarNavItem from "@/components/dashboard/shell/SidebarNavItem";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "AI Analysis", href: "/dashboard/analysis", icon: Sparkles },
  { label: "Competitors", href: "/competitors", icon: Users },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Templates", href: "/templates", icon: LayoutTemplate },
  { label: "Settings", href: "/settings", icon: Settings },
];

const COLLAPSE_STORAGE_KEY = "atlas-ai-sidebar-collapsed";

// A tiny external store over localStorage, read via useSyncExternalStore
// below. This is what actually fixes the hydration mismatch: the server
// has no localStorage, so it can only ever render the collapsed state as
// `getServerSnapshot` says (false). React guarantees the client's first
// render — the one hydration diffs against — uses that same server
// snapshot rather than the real stored value, so hydration never sees a
// mismatch; the real value (and any later change, via the toggle button
// below) is picked up in a subsequent, ordinary re-render. The previous
// code read localStorage directly inside a useState lazy initializer,
// which runs during the client's very first render — exactly the render
// hydration compares against — so a returning visitor with "true" stored
// produced different markup (width, collapsed styling, the Logo-vs-"A"
// swap) than the server had rendered.
const collapseListeners = new Set<() => void>();

function getStoredCollapsed(): boolean {
  return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true";
}

function getServerCollapsedSnapshot(): boolean {
  return false;
}

function setStoredCollapsed(value: boolean): void {
  window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(value));
  collapseListeners.forEach((listener) => listener());
}

function subscribeToCollapsed(listener: () => void): () => void {
  collapseListeners.add(listener);
  return () => collapseListeners.delete(listener);
}

interface SidebarNavListProps {
  collapsed: boolean;
  activePathname: string | null;
  onNavigate?: () => void;
}

// The logo + nav items, shared between the desktop rail and the mobile
// drawer. Collapsing is a desktop-only concept (the mobile drawer always
// renders this with collapsed=false), so this stays a plain function
// rather than owning any state itself.
function SidebarNavList({ collapsed, activePathname, onNavigate }: SidebarNavListProps) {
  return (
    <>
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border px-4",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            A
          </span>
        ) : (
          <Logo />
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={activePathname === item.href}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}

interface SidebarProps {
  // Mobile-only: the drawer's open state lives in AppShell since the
  // Header's hamburger button needs to trigger it too. Desktop collapse
  // state below stays local to this component since nothing else needs it.
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    getStoredCollapsed,
    getServerCollapsedSnapshot
  );

  function toggleCollapsed() {
    setStoredCollapsed(!collapsed);
  }

  return (
    <>
      {/* Desktop: persistent, collapsible, in normal layout flow */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex"
      >
        <SidebarNavList collapsed={collapsed} activePathname={pathname} />

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              collapsed && "justify-center px-2"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Mobile: overlay drawer with a backdrop, triggered from Header.
          Always fully expanded — collapsing doesn't make sense inside an
          overlay the user is about to dismiss anyway. */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              aria-label="Close navigation"
              onClick={onCloseMobile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 flex w-[240px] flex-col bg-sidebar shadow-xl"
            >
              <SidebarNavList
                collapsed={false}
                activePathname={pathname}
                onNavigate={onCloseMobile}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
