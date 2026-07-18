import Link from "next/link";
import { cn } from "@/lib/utils";

interface SettingsNavProps {
  active: "account" | "billing" | "usage";
}

const LINKS = [
  { key: "account", label: "Account", href: "/settings" },
  { key: "billing", label: "Billing", href: "/settings/billing" },
  { key: "usage", label: "Usage", href: "/settings/usage" },
] as const;

// Shared across all three Settings pages (Milestone 45 — Settings grew
// from a single stub to three real pages, the point this codebase's
// own "three repetitions" rule promotes a pattern to a shared
// component). Server-renderable: `active` is passed in by the page
// itself rather than read via usePathname(), so this stays a plain
// Server Component like the rest of Settings.
export default function SettingsNav({ active }: SettingsNavProps) {
  return (
    <nav className="mb-8 flex gap-1 border-b border-border">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={link.key === active ? "page" : undefined}
          className={cn(
            "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            link.key === active
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
