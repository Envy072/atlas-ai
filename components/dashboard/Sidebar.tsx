"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  FolderKanban,
  Search,
  Users,
  FileText,
  Settings,
  Sparkles,
} from "lucide-react";

const links = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    name: "Research",
    href: "/research",
    icon: Search,
  },
  {
    name: "Competitors",
    href: "/competitors",
    icon: Users,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">

      <div className="flex h-20 items-center justify-center border-b">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
          <Sparkles className="h-6 w-6" />
        </div>

      </div>

      <nav className="flex-1 space-y-3 p-4">

        {links.map((link) => {
          const Icon = link.icon;

          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex h-14 items-center justify-center rounded-2xl transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-6 w-6" />
            </Link>
          );
        })}

      </nav>

      <div className="border-t p-4">

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 font-bold text-white">
          Y
        </div>

      </div>

    </div>
  );
}