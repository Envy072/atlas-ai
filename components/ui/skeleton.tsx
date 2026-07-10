import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// A shimmering placeholder block for content that's still loading — a
// moving highlight sweep (see the shimmer-sweep keyframe in globals.css)
// rather than a generic opacity pulse. Prefer composing a few of these to
// mirror the real content's shape (see DESIGN_SYSTEM.md's Loading States
// guidance) over a single generic rectangle.
function Skeleton({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-lg bg-muted bg-size-[200%_100%]", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--muted) 40%, color-mix(in oklch, var(--muted), var(--foreground) 8%) 50%, var(--muted) 60%)",
        animation: "shimmer-sweep 1.8s ease-in-out infinite",
        ...style,
      }}
      {...props}
    />
  );
}

export { Skeleton };
