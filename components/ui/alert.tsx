import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-2xl border p-4 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-muted/40 text-foreground",
      success: "border-success/20 bg-success/10 text-success",
      warning: "border-warning/25 bg-warning/15 text-warning",
      destructive: "border-destructive/20 bg-destructive/10 text-destructive",
      info: "border-info/20 bg-info/10 text-info",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

function AlertTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-semibold", className)} {...props} />;
}

function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("leading-6 opacity-90", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
