import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        <Link href="/" className="text-2xl font-bold tracking-tight">
          Atlas<span className="text-blue-600">AI</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features">Features</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" render={<Link href="/login" />}>
            Sign In
          </Button>

          <Button render={<Link href="/dashboard/analysis" />}>
            Get Started
          </Button>
        </div>

      </div>
    </header>
  );
}