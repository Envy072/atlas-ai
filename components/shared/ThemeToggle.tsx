"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_STORAGE_KEY = "atlas-ai-theme";

function getCurrentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// A minimal light/dark toggle. The initial value is read lazily (once,
// during the first render) from the DOM class the bootstrap script in
// app/layout.tsx already applied before paint, rather than corrected in an
// effect after mount — see CLAUDE.md Section 10 for why the tokens this
// toggle switches between already exist in globals.css.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getCurrentTheme);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <span suppressHydrationWarning>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  );
}
