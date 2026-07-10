const SECTIONS = [
  { id: "section-summary", label: "Summary" },
  { id: "section-market", label: "Market" },
  { id: "section-competition", label: "Competition" },
  { id: "section-swot", label: "SWOT" },
  { id: "section-business-model", label: "Business Model" },
  { id: "section-financial", label: "Financial" },
  { id: "section-roadmap", label: "Roadmap" },
  { id: "section-verdict", label: "Verdict" },
];

// Plain in-page anchor links — native browser scrolling (no JS needed),
// which already respects the reduced-motion CSS rule in globals.css.
// Each id matches the corresponding report section's own `id`, so this
// stays correct even as sections are reordered or added independently.
export default function ReportNav() {
  return (
    <nav
      aria-label="Report sections"
      className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 lg:flex-col lg:overflow-visible lg:whitespace-normal lg:pb-0"
    >
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
