"use client"

import { Toast } from "@base-ui/react/toast"
import { CheckCircle2, XCircle, X } from "lucide-react"

import { cn } from "@/lib/utils"

// The one toast primitive in this codebase (Milestone 45) — built off
// @base-ui/react, matching every other primitive in components/ui/
// (button, dialog, select). ToastProvider must wrap the app once, near
// the root (app/layout.tsx); ToastViewport + ToastList render the
// actual toasts anywhere inside that provider. Callers never construct
// a toast by hand — they call useToastManager().add({ title,
// description, type }) from any client component under the provider.

const ToastProvider = Toast.Provider

const useToastManager = Toast.useToastManager

const TYPE_ICON: Record<string, typeof CheckCircle2 | undefined> = {
  success: CheckCircle2,
  error: XCircle,
}

const TYPE_ICON_CLASSNAME: Record<string, string> = {
  success: "text-success",
  error: "text-destructive",
}

function ToastViewport({ className, ...props }: Toast.Viewport.Props) {
  return (
    <Toast.Portal>
      <Toast.Viewport
        className={cn("fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 outline-none", className)}
        {...props}
      />
    </Toast.Portal>
  )
}

// Renders every currently-active toast from the shared manager — one
// component, mounted once alongside ToastViewport, rather than each
// caller rendering its own list.
function ToastList() {
  const { toasts } = useToastManager()

  return toasts.map((toast) => {
    const Icon = toast.type ? TYPE_ICON[toast.type] : undefined

    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          "relative flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg",
          "data-[starting-style]:translate-x-[calc(100%+1rem)] data-[starting-style]:opacity-0",
          "data-[ending-style]:opacity-0",
          "transition-all duration-200"
        )}
      >
        {Icon && <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", TYPE_ICON_CLASSNAME[toast.type ?? ""])} />}
        <div className="min-w-0 flex-1">
          <Toast.Title className="text-sm font-semibold text-foreground" />
          <Toast.Description className="mt-1 text-sm text-muted-foreground" />
        </div>
        <Toast.Close
          aria-label="Dismiss notification"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Toast.Close>
      </Toast.Root>
    )
  })
}

export { ToastProvider, ToastViewport, ToastList, useToastManager }
