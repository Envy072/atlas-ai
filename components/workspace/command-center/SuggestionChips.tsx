"use client";

interface SuggestionChipsProps {
  onSelect: (idea: string) => void;
  disabled?: boolean;
}

// Example prompts, exactly like Perplexity/ChatGPT's starter suggestions —
// these are illustrative inputs for the user to try, not analysis output,
// so they aren't "fake data" in the sense the rest of this app avoids.
const EXAMPLE_IDEAS = [
  "An AI-powered code review assistant for small engineering teams",
  "A subscription meal-kit service tailored to busy new parents",
  "A marketplace connecting freelance designers with early-stage startups",
  "An AI note-taking app built for medical professionals",
];

export default function SuggestionChips({ onSelect, disabled }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLE_IDEAS.map((idea) => (
        <button
          key={idea}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(idea)}
          className="rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-left text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {idea}
        </button>
      ))}
    </div>
  );
}
