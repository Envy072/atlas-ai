import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends ProgressPrimitive.Root.Props {
  className?: string
}

// value={null} (or omitted) renders an indeterminate, sliding bar — for
// when there's genuinely no real percentage to report, rather than
// fabricating one. Passing a number renders a normal determinate fill.
function Progress({ className, value, ...props }: ProgressProps) {
  const indeterminate = value === null || value === undefined

  return (
    <ProgressPrimitive.Root value={value} className={cn("w-full", className)} {...props}>
      <ProgressPrimitive.Track className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Indicator
          className={cn(
            "block h-full rounded-full bg-primary",
            indeterminate ? "w-1/3" : "transition-[width] duration-300 ease-out"
          )}
          style={
            indeterminate
              ? { animation: "progress-indeterminate 1.2s ease-in-out infinite" }
              : { width: `${value}%` }
          }
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
