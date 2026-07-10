import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPillVariants = cva("inline-flex items-center gap-1.5 text-xs font-semibold", {
  variants: {
    tone: {
      neutral: "text-muted-foreground",
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning",
      destructive: "text-destructive",
      info: "text-info",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

const dotVariants = cva("h-1.5 w-1.5 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-muted-foreground",
      primary: "bg-primary",
      success: "bg-success",
      warning: "bg-warning",
      destructive: "bg-destructive",
      info: "bg-info",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

interface StatusPillProps extends VariantProps<typeof statusPillVariants> {
  label: string;
  className?: string;
  pulse?: boolean;
}

// A dot + label indicator for live/verdict-style state ("Recommended",
// "Analyzing...", "Live") — distinct from Badge, which is for tags/counts
// rather than status.
function StatusPill({ label, tone, className, pulse = false }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ tone }), className)}>
      <span className={cn(dotVariants({ tone }), pulse && "animate-pulse")} aria-hidden="true" />
      {label}
    </span>
  );
}

export { StatusPill };
