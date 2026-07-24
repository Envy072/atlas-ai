import { describe, it, expect, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { formatRelativeTime } from "@/lib/format";
import RelativeTime from "@/components/shared/RelativeTime";

// Milestone 111 — proves the two properties that actually prevent the
// hydration mismatch found during Milestone 110's manual validation:
// (1) this wrapper introduces no formatting drift of its own — it
// renders exactly what formatRelativeTime() produces — and (2)
// suppressHydrationWarning is genuinely set on the element, which is
// the one thing that turns "React throws on server/client text
// mismatch" into "React accepts the client's value for this node
// silently." A true SSR-then-hydrate reproduction would need jsdom and
// react-dom/client's hydrateRoot, a testing pattern this codebase
// doesn't otherwise use (TESTING.md) — verified instead via the real
// browser manual validation in this milestone's own report.
describe("RelativeTime", () => {
  const NOW = new Date("2026-07-15T12:00:00.000Z");

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders exactly what formatRelativeTime produces", () => {
    vi.setSystemTime(NOW);
    const isoDate = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const html = renderToStaticMarkup(<RelativeTime isoDate={isoDate} />);

    expect(html).toContain(formatRelativeTime(isoDate));
  });

  it("marks its rendered element to suppress the expected server/client text mismatch", () => {
    const element = RelativeTime({ isoDate: NOW.toISOString() });
    expect(element.props.suppressHydrationWarning).toBe(true);
  });

  it("passes className through unchanged", () => {
    vi.setSystemTime(NOW);
    const element = RelativeTime({ isoDate: NOW.toISOString(), className: "text-xs text-muted-foreground" });
    expect(element.props.className).toBe("text-xs text-muted-foreground");
  });

  it("demonstrates the underlying drift this component exists to tolerate", () => {
    const isoDate = new Date(NOW.getTime() - 30_000).toISOString();

    vi.setSystemTime(NOW);
    const atServerRenderTime = formatRelativeTime(isoDate);
    expect(atServerRenderTime).toBe("30 seconds ago");

    // Simulates hydration happening 31 real seconds after the server
    // rendered — enough to cross the "second" → "minute" bucket
    // boundary in RELATIVE_TIME_UNITS (lib/format.ts), producing a
    // different, equally-correct string. This is the exact class of
    // mismatch RecentActivityPanel/ReportHistoryPanel hit in practice.
    vi.setSystemTime(new Date(NOW.getTime() + 31_000));
    const atClientHydrationTime = formatRelativeTime(isoDate);
    expect(atClientHydrationTime).toBe("1 minute ago");

    expect(atClientHydrationTime).not.toBe(atServerRenderTime);
  });
});
