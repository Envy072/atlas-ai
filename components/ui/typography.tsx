import type { HTMLAttributes, LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// The complete Atlas AI type scale (DESIGN_SYSTEM.md documents the full
// rationale). Every heading/body/caption in the app should come from one
// of these instead of a bespoke text-*/font-* combination, so "what does a
// page title look like" has exactly one answer.

function Display({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-5xl font-bold tracking-tight text-foreground md:text-6xl",
        className
      )}
      {...props}
    />
  );
}

function H1({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn("text-4xl font-bold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function H2({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-3xl font-bold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function H3({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-2xl font-semibold text-foreground", className)} {...props} />
  );
}

function H4({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4 className={cn("text-xl font-semibold text-foreground", className)} {...props} />
  );
}

function Large({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-lg font-medium text-foreground", className)} {...props} />
  );
}

function Body({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-base leading-7 font-normal text-foreground", className)}
      {...props}
    />
  );
}

function Small({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-6 font-medium text-foreground", className)} {...props} />
  );
}

function Caption({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs leading-5 text-muted-foreground", className)} {...props} />
  );
}

function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm leading-none font-medium text-foreground", className)}
      {...props}
    />
  );
}

// Not a rendered element on its own — the same classes components/ui/button.tsx
// already applies to its label text, exported here so a custom button-like
// element (e.g. a Link styled as a button) can match it exactly.
const buttonTextClassName = "text-sm font-medium";

export { Display, H1, H2, H3, H4, Large, Body, Small, Caption, Label, buttonTextClassName };
