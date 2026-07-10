import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
}

// The Atlas AI wordmark. Currently duplicated as inline JSX in
// components/layout/Navbar.tsx (landing page, out of scope to touch this
// sprint) — new dashboard UI should import this instead of re-typing the
// mark, so there's one definition going forward.
export default function Logo({ className }: LogoProps) {
  return (
    <span className={cn("text-xl font-bold tracking-tight text-foreground", className)}>
      Atlas<span className="text-blue-600">AI</span>
    </span>
  )
}
